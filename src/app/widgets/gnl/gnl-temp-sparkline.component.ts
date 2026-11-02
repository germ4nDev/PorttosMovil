/*
    Author: German Valencia
    Temperatura criogénica GNL (PTT_GNL_CHART_SPK_TEMP), igual a gnl-temp-sparkline-widget de la web (OT-005): número grande,
    límite operativo −150 °C y la línea invertida de chart.js al fondo (60 puntos en vivo, «anti-rampa» si llegan dos pulsos en
    el mismo segundo, auto-zoom de 15 %). Datos: GnlVivoService (socket, brazo elegido); al cambiar de brazo se limpia.
*/
import { AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, Input, OnDestroy, ViewChild, effect, inject, untracked } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { LIMITE_OPERATIVO_TEMP_GNL, VentanaGnl, WidgetComponente, autoZoomGnl, empujarVentanaGnl, prellenarVentanaGnl } from '@nucleo';
import { GnlVivoService } from '../../core/gnl-vivo.service';
import { IconoComponent } from '../../compartido/icono.component';

Chart.register(...registerables);

@Component({
    selector: 'pm-gnl-temp-sparkline',
    standalone: true,
    imports: [DecimalPipe, IconoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="pt-tarjeta gnl">
      <header class="gnl__cabeza">
        <pm-icono nombre="termometro" [tam]="16"></pm-icono>
        <div class="gnl__textos">
          <h2 class="pt-tarjeta__titulo">{{ w.titulo }}</h2>
          @if (w.subtitulo) { <p class="pt-tarjeta__sub gnl__sub">{{ w.subtitulo }}</p> }
        </div>
        @if (!cargando) { <span class="insignia">{{ brazo }}</span> }
      </header>

      <div class="cuerpo">
        <div class="numero">
          @if (cargando) {
            <span class="girando" role="status" aria-label="…"></span>
          } @else {
            <strong>{{ tempActual | number: '1.2-2' }} °C</strong>
            <small>Límite operativo: {{ limite | number: '1.1-1' }} °C</small>
          }
        </div>
        <div class="lienzo"><canvas #tempCanvas></canvas></div>
      </div>
    </section>
    `,
    styles: [`
    :host { display: block; min-width: 0; height: 100%; min-height: 0; }
    .gnl { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 10px 12px; overflow: hidden; }
    .gnl__cabeza { display: flex; align-items: center; gap: 8px; color: var(--pt-texto); position: relative; z-index: 3; }
    .gnl__textos { flex: 1; min-width: 0; }
    /* Título y subtítulo en una línea: la celda del teléfono es baja y el medidor o la gráfica necesitan el alto */
    .gnl__textos h2, .gnl__textos p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gnl__sub { text-transform: uppercase; }
    .insignia { background: #212529; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
    .cuerpo { flex: 1; position: relative; min-height: 60px; container-type: size; }
    .numero { position: absolute; inset: 0; z-index: 2; padding-bottom: 12cqh; pointer-events: none;
      display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .numero strong { font-size: clamp(1.4rem, 30cqh, 4.5rem); font-weight: 800; letter-spacing: -1.5px; color: var(--pt-info);
      text-shadow: 0 4px 10px rgba(0,0,0,0.4); line-height: 1.1; margin-bottom: 4px; }
    .numero small { font-size: 12px; font-weight: 500; color: var(--pt-subtitulo); }
    .lienzo { position: absolute; bottom: 0; left: 0; width: 100%; height: 45%; z-index: 1; }
    .girando { width: 1rem; height: 1rem; border: 2px solid var(--pt-info); border-right-color: transparent; border-radius: 50%; animation: giro .75s linear infinite; }
    @keyframes giro { to { transform: rotate(360deg); } }
    `],
})
export class GnlTempSparklineComponent implements AfterViewInit, OnDestroy {
    @Input({ required: true }) w!: WidgetComponente;
    @ViewChild('tempCanvas') tempCanvas!: ElementRef<HTMLCanvasElement>;

    private readonly gnl = inject(GnlVivoService);
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
                    label: 'Temperatura °C', data: [], borderColor: '#00d4ff', borderWidth: 3, pointRadius: 0,
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
