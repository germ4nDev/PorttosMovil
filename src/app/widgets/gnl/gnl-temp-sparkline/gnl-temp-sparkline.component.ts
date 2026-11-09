/*
    Author: German Valencia
    Temperatura criogénica GNL (PTT_GNL_CHART_SPK_TEMP), igual a gnl-temp-sparkline-widget de la web (OT-005): número grande,
    límite operativo −150 °C y la línea invertida de chart.js al fondo (60 puntos en vivo, «anti-rampa» si llegan dos pulsos en
    el mismo segundo, auto-zoom de 15 %). Datos: GnlVivoService (socket, brazo elegido); al cambiar de brazo se limpia.
*/
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, effect, inject, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LIMITE_OPERATIVO_TEMP_GNL, VentanaGnl, WidgetComponente, autoZoomGnl, empujarVentanaGnl, prellenarVentanaGnl } from '@nucleo';
import { GnlVivoService } from '../../../core/gnl-vivo.service';
import { IconoComponent } from '../../../compartido/icono/icono.component';

Chart.register(...registerables);

@Component({
    selector: 'pm-gnl-temp-sparkline',
    standalone: true,
    imports: [DecimalPipe, IconoComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './gnl-temp-sparkline.component.html',
    styleUrl: './gnl-temp-sparkline.component.scss',
})
export class GnlTempSparklineComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) w!: WidgetComponente;
    @ViewChild('tempCanvas') tempCanvas!: ElementRef<HTMLCanvasElement>;

    private readonly gnl = inject(GnlVivoService);
    private readonly translate = inject(TranslateService);
    private readonly cdr = inject(ChangeDetectorRef);
    readonly limite = LIMITE_OPERATIVO_TEMP_GNL;
    tempActual = 0;
    cargando = true;
    brazo = 'TODOS';
    private chart: Chart | null = null;
    private ventana: VentanaGnl = { labels: [], valores: [] };
    private brazoVisto = 'TODOS';

    constructor() {
        effect(() => {
            const brazo = this.gnl.brazo();
            const l = this.gnl.lectura();
            untracked(() => {
                if (brazo !== this.brazoVisto) { this.brazoVisto = brazo; this.limpiar(); }
                if (l && l.temperatura !== null) this.procesar(l.temperatura, l.timestamp, l.brazo);
            });
        });
    }

    ngAfterViewInit(): void {
        this.crearGrafico();
        this.pintar();
    }

    ngOnDestroy(): void {
        this.chart?.destroy();
    }

    private procesar(temp: number, timestamp: string, brazo: string): void {
        this.tempActual = temp;
        this.brazo = brazo;
        const fecha = new Date(timestamp);
        const hora = (d: Date) => d.toLocaleTimeString();
        // Pre-llenado si la ventana está vacía (la web no lo hace con 0 °C)
        if (!this.ventana.valores.length && temp !== 0) this.ventana = prellenarVentanaGnl(temp, isNaN(fecha.getTime()) ? new Date() : fecha, hora);
        this.ventana = empujarVentanaGnl(this.ventana, isNaN(fecha.getTime()) ? String(timestamp) : hora(fecha), temp, true);
        this.cargando = false;
        this.pintar();
        this.cdr.markForCheck();
    }

    private pintar(): void {
        if (!this.chart) return;
        this.chart.data.labels = [...this.ventana.labels];
        this.chart.data.datasets[0].data = [...this.ventana.valores];
        const z = autoZoomGnl(this.ventana.valores, 'temperatura');
        const y = this.chart.options.scales?.['y'];
        if (z && y) { y.min = z.min; y.max = z.max; }
        this.chart.update('none');
    }

    private limpiar(): void {
        this.tempActual = 0;
        this.ventana = { labels: [], valores: [] };
        this.cargando = true;
        this.chart?.destroy();
        this.chart = null;
        this.crearGrafico();
        this.cdr.markForCheck();
    }

    /** Misma configuración de chart.js que la web (línea invertida con relleno hacia arriba, sin ejes). */
    private crearGrafico(): void {
        const ctx = this.tempCanvas?.nativeElement?.getContext('2d');
        if (!ctx) return;
        const config: ChartConfiguration = {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: this.translate.instant('MOVIL.GNL.TEMPERATURA') + ' °C', data: [], borderColor: '#00d4ff', borderWidth: 3, pointRadius: 0,
                    pointHoverRadius: 6, pointHitRadius: 15, pointHoverBackgroundColor: '#ffffff', pointHoverBorderColor: '#00d4ff', pointHoverBorderWidth: 2,
                    fill: 'end', tension: 0.2,
                    backgroundColor: (context: any) => {
                        const { ctx: c, chartArea } = context.chart;
                        if (!chartArea) return 'rgba(0, 212, 255, 0.1)';
                        const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
                        g.addColorStop(0, 'rgba(0, 212, 255, 0.5)');
                        g.addColorStop(0.8, 'rgba(0, 212, 255, 0.0)');
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
                        callbacks: { label: (c) => `Temp: ${c.parsed.y} °C` },
                    },
                },
                layout: { padding: { left: -10, right: -10, top: 0, bottom: -10 } },
                scales: { x: { display: false }, y: { display: false } },
            },
        };
        this.chart = new Chart(ctx, config);
    }
}
