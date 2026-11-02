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
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import {
    HistorialGnl, PALETA_SERIES, RANGOS_HISTORIAL_GNL, VENTANA_GNL, VentanaGnl, VistaHistorialGnl, WidgetComponente, armarHistorialGnl,
    autoZoomGnl, empujarVentanaGnl, prellenarVentanaGnl,
} from '@nucleo';
import { GnlVivoService } from '../../core/gnl-vivo.service';
import { GnlHistorialService } from '../../core/gnl-historial.service';
import { IconoComponent } from '../../compartido/icono.component';

Chart.register(...registerables);

@Component({
    selector: 'pm-gnl-flujo-chart',
    standalone: true,
    imports: [DecimalPipe, IconoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="pt-tarjeta gnl">
      <header class="gnl__cabeza">
        <pm-icono nombre="actividad" [tam]="16"></pm-icono>
        <div class="gnl__textos">
          <h2 class="pt-tarjeta__titulo">{{ w.titulo }}</h2>
          @if (w.subtitulo) { <p class="pt-tarjeta__sub gnl__sub">{{ w.subtitulo }}</p> }
        </div>
        <button type="button" class="ampliar" (click)="abrir()" aria-label="Ampliar"><pm-icono nombre="ampliar" [tam]="16"></pm-icono></button>
      </header>
      <div class="acciones">
        <span class="energia-pill" [class.cargando]="cargando"><pm-icono nombre="rayo" [tam]="12"></pm-icono>{{ energiaTotal | number: '1.2-2' }} MMBTU</span>
        @if (!cargando) { <span class="insignia">{{ brazo }}</span> }
      </div>
      <div class="cuerpo">
        @if (cargando) { <div class="espera"><span class="girando" role="status" aria-label="Conectando a SCADA..."></span></div> }
        <div class="lienzo" [class.oculto]="cargando"><canvas #flowCanvas></canvas></div>
      </div>
    </section>

    @if (ampliada()) {
      <div class="modal" role="dialog" aria-modal="true" [attr.aria-label]="w.titulo">
        <section class="pt-tarjeta modal__caja">
          <header class="gnl__cabeza">
            <pm-icono nombre="actividad" [tam]="18"></pm-icono>
            <div class="gnl__textos"><h2 class="pt-tarjeta__titulo">{{ w.titulo }}</h2></div>
            <button type="button" class="ampliar" (click)="cerrar()" aria-label="Cerrar"><pm-icono nombre="cerrarX" [tam]="18"></pm-icono></button>
          </header>

          <div class="detalle-cabecera">
            <h3 class="detalle-titulo">Historial consolidado por hora</h3>
            <div class="rango">
              @if (historial()?.simulado) { <span class="detalle-simulado">SIMULADO</span> }
              @for (h of rangos; track h) {
                <button type="button" [class.activo]="horas() === h" [disabled]="cargandoHistorial()" (click)="cambiarHoras(h)">{{ h }} h</button>
              }
            </div>
          </div>

          @if (vista(); as v) {
            <div class="detalle-resumen">
              <span>Volumen: <strong>{{ v.resumen.volumen | number: '1.0-1' }} m³</strong></span>
              <span>Energía: <strong>{{ v.resumen.energia | number: '1.0-1' }} MMBTU</strong></span>
              @if (v.resumen.presion !== null) { <span>Presión prom.: <strong>{{ v.resumen.presion | number: '1.0-1' }} psi</strong></span> }
              <span>Alarmas: <strong>{{ v.resumen.alarmas | number: '1.0-0' }}</strong></span>
            </div>
          }
          @if (nota()) { <p class="detalle-ayuda">{{ nota() }}</p> }
          @if (cargandoHistorial()) { <div class="espera"><span class="girando" role="status" aria-label="…"></span></div> }
          <div class="detalle-grafica" [class.oculto]="!(historial()?.filas && historial()?.labels?.length)"><canvas #histCanvas></canvas></div>

          @if (vista()?.filasBrazos?.length) {
            <h3 class="detalle-titulo">Volumen por brazo</h3>
            <div class="tabla">
              <table>
                <thead><tr><th>Brazo</th><th>Volumen</th><th>Energía</th><th>Participación</th><th>Horas con flujo</th></tr></thead>
                <tbody>
                  @for (f of vista()!.filasBrazos; track f.brazo) {
                    <tr>
                      <td class="principal">{{ f.brazo }}</td>
                      <td>{{ f.volumenM3 | number: '1.1-1' }} m³</td>
                      <td>{{ f.energiaMmbtu | number: '1.1-1' }} MMBTU</td>
                      <td><span class="avance"><span [style.width.%]="f.participacion"></span></span>{{ f.participacion }} %</td>
                      <td>{{ f.horasConFlujo | number: '1.0-0' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>
    }
    `,
    styles: [`
    :host { display: block; min-width: 0; height: 100%; min-height: 0; }
    .gnl { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 10px 12px; overflow: hidden; }
    .gnl__cabeza { display: flex; align-items: center; gap: 8px; color: var(--pt-texto); }
    .gnl__textos { flex: 1; min-width: 0; }
    /* Título y subtítulo en una línea: la celda del teléfono es baja y el medidor o la gráfica necesitan el alto */
    .gnl__textos h2, .gnl__textos p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gnl__sub { text-transform: uppercase; }
    .ampliar { width: 34px; height: 34px; border: 0; border-radius: 8px; background: transparent; color: var(--pt-subtitulo);
      display: flex; align-items: center; justify-content: center; flex: none; }
    .acciones { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 4px; }
    .energia-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border: 1px solid var(--app-navbar-color, #346BA6);
      border-radius: 50px; color: var(--app-navbar-color, #346BA6); background: var(--pt-tarjeta); font-size: 11.5px; font-weight: 600; }
    .energia-pill.cargando { opacity: .5; }
    .insignia { background: #212529; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
    .cuerpo { flex: 1; position: relative; min-height: 60px; }
    .lienzo { position: absolute; inset: 0; }
    .oculto { visibility: hidden; }
    .espera { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .girando { width: 2rem; height: 2rem; border: 3px solid var(--pt-info); border-right-color: transparent; border-radius: 50%; animation: giro .75s linear infinite; }
    @keyframes giro { to { transform: rotate(360deg); } }
    .modal { position: fixed; inset: 0; z-index: 50; background: rgba(0, 0, 0, .6); display: flex; align-items: stretch; justify-content: center;
      padding: calc(var(--pt-seguro-arriba) + 12px) 10px calc(var(--pt-seguro-abajo) + 12px); }
    .modal__caja { width: 100%; max-width: 900px; overflow: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .detalle-cabecera { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
    .detalle-titulo { margin: 0; font-size: 13px; font-weight: 600; color: var(--pt-texto-fuerte); }
    .rango { display: flex; align-items: center; gap: 6px; }
    .rango button { border: 1px solid var(--pt-borde); background: var(--pt-tarjeta-2); color: var(--pt-texto); border-radius: 6px; padding: 5px 9px; font-size: 12px; }
    .rango button.activo { background: var(--app-navbar-color, #346BA6); border-color: var(--app-navbar-color, #346BA6); color: #fff; }
    .detalle-simulado { font-size: 10px; font-weight: 700; color: #111; background: var(--pt-advertencia); border-radius: 4px; padding: 2px 6px; }
    .detalle-resumen { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12.5px; color: var(--pt-texto); }
    .detalle-ayuda { margin: 0; font-size: 12px; color: var(--pt-subtitulo); }
    .detalle-grafica { position: relative; height: 240px; flex: none; }
    .tabla { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { padding: 6px 8px; text-align: right; border-bottom: 1px solid var(--pt-borde); white-space: nowrap; }
    th { color: var(--pt-subtitulo); font-weight: 600; }
    th:first-child, td.principal { text-align: left; font-weight: 600; color: var(--pt-texto-fuerte); }
    .avance { display: inline-block; width: 50px; height: 6px; border-radius: 3px; background: var(--pt-tarjeta-2); margin-right: 6px; overflow: hidden; vertical-align: middle; }
    .avance span { display: block; height: 100%; background: var(--pt-info); }
    `],
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
                    label: 'Flujo', data: [], borderColor: '#00d4ff', borderWidth: 2, pointRadius: 0,
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
                datasets: v.series.map((s, i) => ({ label: s.label, data: s.data, backgroundColor: PALETA_SERIES[i % PALETA_SERIES.length], borderRadius: 2 })),
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
