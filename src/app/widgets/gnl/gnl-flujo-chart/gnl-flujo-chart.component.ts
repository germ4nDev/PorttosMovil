/*
    Author: German Valencia
    Histórico de flujo GNL (PTT_GNL_LINECHART_FLUJO), igual a gnl-flujo-chart de la web (OT-005):
      - En la tarjeta: caudal en vivo con chart.js (60 puntos; el motor avanza cada 2 s con el último caudal conocido; el primer
        pulso pre-llena la ventana; auto-zoom de 5 %), píldora de energía (MMBTU del pulso) e insignia del brazo.
      - Vista ampliada (botón ampliar, como la de la web): historial consolidado por hora de 24, 72 o 168 h
        (GET /api/gnl-telemetria/historial/:puerto), volumen apilado por brazo, resumen y tabla de volumen por brazo.
    Datos: GnlVivoService (socket, brazo elegido) y GnlHistorialService (mismo endpoint de la web).
*/
import {
    AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, effect, inject, signal, untracked,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
    HistorialGnl, PALETA_SERIES, RANGOS_HISTORIAL_GNL, VENTANA_GNL, VentanaGnl, VistaHistorialGnl, WidgetComponente, armarHistorialGnl,
    autoZoomGnl, empujarVentanaGnl, prellenarVentanaGnl,
} from '@nucleo';
import { GnlVivoService } from '../../../core/gnl-vivo.service';
import { GnlHistorialService } from '../../../core/gnl-historial.service';
import { IconoComponent } from '../../../compartido/icono/icono.component';

Chart.register(...registerables);

@Component({
    selector: 'pm-gnl-flujo-chart',
    standalone: true,
    imports: [DecimalPipe, IconoComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './gnl-flujo-chart.component.html',
    styleUrl: './gnl-flujo-chart.component.scss',
})
export class GnlFlujoChartComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) w!: WidgetComponente;
    @ViewChild('flowCanvas') flowCanvas!: ElementRef<HTMLCanvasElement>;
    @ViewChild('histCanvas') set histCanvas(e: ElementRef<HTMLCanvasElement> | undefined) {
        this.lienzoHistorial = e?.nativeElement ?? null;
        this.pintarHistorial();
    }

    private readonly gnl = inject(GnlVivoService);
    private readonly historiales = inject(GnlHistorialService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly translate = inject(TranslateService);

    energiaTotal = 0;
    brazo = 'TODOS';
    cargando = true;
    private ultimoFlujo = 0;
    private ventana: VentanaGnl = { labels: [], valores: [] };
    private chart: Chart | null = null;
    private motor: ReturnType<typeof setInterval> | null = null;
    private brazoVisto = 'TODOS';

    // Vista ampliada
    readonly rangos = RANGOS_HISTORIAL_GNL;
    readonly ampliada = signal(false);
    readonly horas = signal<number>(24);
    readonly historial = signal<HistorialGnl | null>(null);
    readonly vista = signal<VistaHistorialGnl | null>(null);
    readonly nota = signal<string | null>(null);
    readonly cargandoHistorial = signal(false);
    private lienzoHistorial: HTMLCanvasElement | null = null;
    private chartHistorial: Chart | null = null;

    constructor() {
        effect(() => {
            const brazo = this.gnl.brazo();
            const l = this.gnl.lectura();
            untracked(() => {
                if (brazo !== this.brazoVisto) { this.brazoVisto = brazo; this.limpiar(); }
                if (l && l.flujo !== null) this.procesar(l.flujo, l.brazo);
            });
        });
        // Motor gráfico: cada 2 s agrega el último caudal conocido (solo después del primer pulso), como la web
        this.motor = setInterval(() => { if (!this.cargando) this.avanzar(); }, VENTANA_GNL.pasoMs);
    }

    ngAfterViewInit(): void {
        this.crearGrafico();
        this.pintar();
    }

    ngOnDestroy(): void {
        if (this.motor) clearInterval(this.motor);
        this.chart?.destroy();
        this.chartHistorial?.destroy();
    }

    private procesar(flujo: number, brazo: string): void {
        if (brazo !== this.brazo && !this.cargando) this.limpiar();
        this.brazo = brazo;
        this.ultimoFlujo = Number(flujo.toFixed(2));
        if (this.cargando) {
            this.ventana = prellenarVentanaGnl(this.ultimoFlujo, new Date(), (d) => d.toLocaleTimeString());
            this.cargando = false;
            this.pintar();
        }
        // Sin energy_consumption en el pulso, la web usa caudal × 22,4 / 3600 (la misma regla de energiaPulsoGnl)
        this.energiaTotal = (flujo * 22.4) / 3600;
        this.cdr.markForCheck();
    }

    private avanzar(): void {
        this.ventana = empujarVentanaGnl(this.ventana, new Date().toLocaleTimeString(), this.ultimoFlujo);
        this.pintar();
    }

    private pintar(): void {
        if (!this.chart) return;
        this.chart.data.labels = [...this.ventana.labels];
        this.chart.data.datasets[0].data = [...this.ventana.valores];
        const z = autoZoomGnl(this.ventana.valores, 'flujo');
        const y = this.chart.options.scales?.['y'];
        if (z && y) { y.min = z.min; y.max = z.max; }
        this.chart.update('none');
    }

    private limpiar(): void {
        this.energiaTotal = 0;
        this.ventana = { labels: [], valores: [] };
        this.cargando = true;
        this.ultimoFlujo = 0;
        this.pintar();
        this.cdr.markForCheck();
    }

    /** Misma configuración de chart.js que la web (línea con degradado, eje y a la izquierda, sin eje x). */
    private crearGrafico(): void {
        const ctx = this.flowCanvas?.nativeElement?.getContext('2d');
        if (!ctx) return;
        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: this.translate.instant('MOVIL.GNL.FLUJO'), data: [], borderColor: '#00d4ff', borderWidth: 2, pointRadius: 0,
                    pointHoverRadius: 5, pointHitRadius: 15, pointHoverBackgroundColor: '#ffffff', pointHoverBorderColor: '#00d4ff', pointHoverBorderWidth: 2,
                    fill: true, tension: 0.1,
                    backgroundColor: (context: any) => {
                        const { ctx: c, chartArea } = context.chart;
                        if (!chartArea) return 'rgba(0, 212, 255, 0.2)';
                        const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        g.addColorStop(0, 'rgba(0, 212, 255, 0.6)');
                        g.addColorStop(1, 'rgba(0, 212, 255, 0.01)');
                        return g;
                    },
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true, backgroundColor: 'rgba(20, 20, 30, 0.9)', titleColor: '#a1a5b7', bodyColor: '#ffffff',
                        bodyFont: { weight: 'bold', size: 14 }, borderColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1, padding: 10, displayColors: false,
                        callbacks: { label: (c) => `Caudal: ${c.parsed.y} m³/h` },
                    },
                },
                layout: { padding: { left: -10, right: 0, top: 20, bottom: 0 } },
                scales: {
                    x: { display: false },
                    y: {
                        position: 'left', border: { display: false },
                        grid: { color: 'rgba(255, 255, 255, 0.05)', tickLength: 0 },
                        ticks: { color: '#a1a5b7', font: { size: 10 }, padding: 10 },
                    },
                },
            },
        };
        this.chart = new Chart(ctx, config);
    }

    // ------------------------------------------------------------------ vista ampliada

    abrir(): void {
        this.ampliada.set(true);
        void this.cargarHistorial();
    }

    cerrar(): void {
        this.ampliada.set(false);
        this.chartHistorial?.destroy();
        this.chartHistorial = null;
    }

    cambiarHoras(h: number): void {
        this.horas.set(h);
        void this.cargarHistorial();
    }

    private async cargarHistorial(): Promise<void> {
        const puerto = this.gnl.puertoActivo();
        if (!puerto) return;
        this.cargandoHistorial.set(true);
        try {
            const h = await this.historiales.historial(puerto, this.horas());
            const v = armarHistorialGnl(h);
            this.historial.set(h);
            this.vista.set(v);
            this.nota.set(v.nota);
        } catch (e: any) {
            this.historial.set(null);
            this.vista.set(null);
            this.nota.set(e?.error?.msg || 'No se pudo consultar el historial de GNL');
        } finally {
            this.cargandoHistorial.set(false);
            this.pintarHistorial();
            this.cdr.markForCheck();
        }
    }

    /** Barras por hora (apiladas por brazo si hay más de uno), como app-grafica-tcl en la vista ampliada de la web. */
    private pintarHistorial(): void {
        const h = this.historial();
        const v = this.vista();
        if (!this.lienzoHistorial || !h || !v) return;
        this.chartHistorial?.destroy();
        const apilado = v.series.length > 1;
        this.chartHistorial = new Chart(this.lienzoHistorial, {
            type: 'bar',
            data: {
                labels: h.labels,
                datasets: v.series.map((s, i) => ({ label: this.translate.instant(s.label), data: s.data, backgroundColor: PALETA_SERIES[i % PALETA_SERIES.length], borderRadius: 2 })),
            },
            options: {
                responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
                plugins: {
                    legend: { display: apilado, labels: { color: '#a1a5b7', boxWidth: 10, font: { size: 11 } } },
                    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y} m³` } },
                },
                scales: {
                    x: { stacked: apilado, ticks: { color: '#a1a5b7', font: { size: 10 }, maxRotation: 0, autoSkip: true }, grid: { display: false } },
                    y: { stacked: apilado, ticks: { color: '#a1a5b7', font: { size: 10 } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } },
                },
            },
        });
    }
}
