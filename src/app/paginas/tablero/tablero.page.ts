/*
    Author: German Valencia
    Tablero (fase 2): widgets móviles de la pestaña activa para el puerto elegido.
      - Con «TODOS» pide elegir un puerto (los widgets son de un puerto; nada fijo a uno en particular).
      - KPI en cuadrícula (2 columnas en teléfono, 3 en tableta), listas y una gráfica por tarjeta.
      - Se recarga al cambiar puerto o pestaña, cada 60 s y al volver la app al primer plano.
      - Tocar un KPI abre su detalle con la gráfica de 24 h.
      - La pestaña Mapa Logístico muestra el mapa (fase 4) en lugar de widgets.
      - Los widgets son los del layout del usuario en la web (o los del por defecto), con la misma regla de la web
        (OT-008); la cabecera dice de cuál salieron. Todo widget va en su celda: sin versión para el teléfono o sin dato,
        como tarjeta con su título. Una pestaña sin layout lo dice (no se inventa una lista).
      - Rejilla (OT-008, 2026-10-29): tableta = posición y tamaño de la BD (rejillaTableta, alto de fila de la web escalado);
        teléfono = KPI arriba de a 2 y lo demás de a 1 (rejillaTelefono).
      - Alto de la web en ambos dispositivos (CC-107, 2026-11-01): tableta con filas de 160 px y separación de 12 px como gridster;
        teléfono con el alto que el widget tiene en la web; gráficas con mínimo 2 filas de la web. KPI por su código (esKpi):
        un KPI sin dato sigue siendo KPI (de a 2, arriba). En la tableta la franja de KPI mide la mitad (CC-108).
      - Tableta = la web (OT-014, CC-110; regla 17): la Torre de Control de la web en un marco (MarcoWebService). La vista nativa
        queda de respaldo (sin conexión, sin respuesta o sin acceso), rotulada y con «Reintentar». El teléfono no cambia.
*/
import { Component, DestroyRef, ElementRef, HostBinding, Type, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { KpiMovil, WidgetMovil, WidgetAnalista, WidgetGrafica, WidgetKpis, WidgetLista, WidgetMapa, estiloPestana, rejillaTelefono, rejillaTableta, estiloCelda, esKpi, ALTO_MEDIA_FILA, SEPARACION_WEB, FILAS_MINIMAS_GRAFICA, Rejilla } from '@nucleo';
import { GnlGaugeComponent } from '../../widgets/gnl/gnl-gauge.component';
import { GnlFlujoChartComponent } from '../../widgets/gnl/gnl-flujo-chart.component';
import { GnlTempSparklineComponent } from '../../widgets/gnl/gnl-temp-sparkline.component';
import { IconoComponent } from '../../compartido/icono.component';
import { OpcionSelector, SelectorComponent } from '../../compartido/selector.component';
import { PestanasService } from '../../core/pestanas.service';
import { PuertoService } from '../../core/puerto.service';
import { SocketService } from '../../core/socket.service';
import { DispositivoService } from '../../core/dispositivo.service';
import { TableroService } from '../../core/tablero.service';
import { GnlVivoService } from '../../core/gnl-vivo.service';
import { IdiomaService } from '../../core/idioma.service';
import { MarcoWebService } from '../../core/marco-web.service';
import { KpiTarjetaComponent } from '../../widgets/kpi-tarjeta/kpi-tarjeta.component';
import { ListaTarjetaComponent } from '../../widgets/lista-tarjeta/lista-tarjeta.component';
import { GraficaTarjetaComponent } from '../../widgets/grafica-tarjeta/grafica-tarjeta.component';
import { DetalleKpiComponent } from '../../widgets/detalle-kpi/detalle-kpi.component';
import { MapaLogisticoComponent } from '../../widgets/mapa-logistico/mapa-logistico.component';
import { AnalistaTarjetaComponent } from '../../widgets/analista-tarjeta/analista-tarjeta.component';
import { MapaAccesoComponent } from '../../widgets/mapa-acceso/mapa-acceso.component';

const REFRESCO_MS = 60000;
/** Filas de la web mínimas por tipo de widget, en ambos dispositivos: una gráfica nunca baja de 2 (usuario, 2026-11-01). */
const FILAS_MINIMAS: Partial<Record<WidgetMovil['tipo'], number>> = { grafica: FILAS_MINIMAS_GRAFICA, componente: FILAS_MINIMAS_GRAFICA };

/** Widgets tipo «componente»: código de la web → componente de la app (como widget-registry.ts de la web). OT-005. */
const COMPONENTES: Record<string, Type<unknown>> = {
    PTT_GNL_GAUGE_PRESION: GnlGaugeComponent,
    PTT_GNL_LINECHART_FLUJO: GnlFlujoChartComponent,
    PTT_GNL_CHART_SPK_TEMP: GnlTempSparklineComponent,
};

@Component({
    selector: 'pm-tablero',
    standalone: true,
    imports: [TranslateModule, NgComponentOutlet, IconoComponent, SelectorComponent, KpiTarjetaComponent, ListaTarjetaComponent, GraficaTarjetaComponent, DetalleKpiComponent, MapaLogisticoComponent, AnalistaTarjetaComponent, MapaAccesoComponent],
    templateUrl: './tablero.page.html',
    styleUrl: './tablero.page.scss'
})
export class TableroPage {
    readonly pestanas = inject(PestanasService);
    readonly puertos = inject(PuertoService);
    readonly socket = inject(SocketService);
    readonly dispositivo = inject(DispositivoService);
    readonly datos = inject(TableroService);
    readonly idioma = inject(IdiomaService);
    readonly marco = inject(MarcoWebService);
    /** Tableta con la web disponible: la página es el marco (la vista nativa no carga datos mientras tanto). */
    readonly conMarco = computed(() => this.marco.usar() && !!this.marco.url && this.marco.estado() !== 'respaldo');

    @HostBinding('class.con-marco') get claseMarco(): boolean {
        return this.conMarco();
    }
    @ViewChild('marcoWeb') set marcoWeb(el: ElementRef<HTMLIFrameElement> | undefined) {
        this.marco.registrar(el?.nativeElement ?? null);
    }

    readonly detalle = signal<KpiMovil | null>(null);
    readonly estilo = computed(() => this.pestanas.activaInfo()?.estilo ?? estiloPestana(this.pestanas.activa()));
    /** La pestaña Mapa Logístico tiene vista propia: el mapa ocupa todo el espacio (fase 4). */
    readonly esMapa = computed(() => this.estilo().vistaPropia === true);

    @HostBinding('class.con-mapa') get conMapa(): boolean {
        return this.esMapa() && this.puertos.seleccionado() !== 'TODOS';
    }
    readonly hora = computed(() => {
        const t = this.datos.tablero()?.generadoEn;
        if (!t) return '';
        const d = new Date(t);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    });
    readonly gnl = inject(GnlVivoService);
    /** Widgets del API con los KPI en vivo sobrepuestos (GNL por socket, como la web). */
    readonly widgets = computed<WidgetMovil[]>(() => {
        const t = this.datos.tablero();
        const vigente = t && t.puerto === this.puertos.seleccionado() && t.pestana === this.pestanas.activa();
        if (!vigente) return [];
        const vivos = this.gnl.valores();
        if (!Object.keys(vivos).length) return t.widgets;
        return t.widgets.map((w) => (w.tipo !== 'kpis' ? w : {
            ...w,
            items: w.items.map((k) => {
                const v = k.vivo === 'gnl' ? vivos[k.id] : undefined;
                return v ? {
                    ...k, valor: v.valor, unidad: v.unidad || k.unidad, estado: v.estado === 'neutro' ? k.estado : v.estado,
                    subtitulo: v.subtitulo ?? k.subtitulo, simulado: v.simulado ?? k.simulado, enVivo: true,
                } : k;
            }),
        }));
    });
    /** Hay tarjetas que se actualizan en vivo en la pestaña actual. */
    private readonly hayVivo = computed(() => {
        const t = this.datos.tablero();
        return !!t && t.widgets.some((w) => (w.tipo === 'kpis' && w.items.some((k) => k.vivo === 'gnl'))
            || (w.tipo === 'componente' && w.codigo.startsWith('PTT_GNL_')));
    });
    /** Rejilla: posiciones por id de widget. Un widget sin celda (API viejo) va al final, a todo el ancho. */
    readonly rejilla = computed<Rejilla | null>(() => {
        const ws = this.widgets();
        if (!ws.length) return null;
        const fin = Math.max(0, ...ws.map((w) => (w.celda ? w.celda.y + w.celda.rows : 0)));
        // Las gráficas piden al menos 2 filas de la web; un KPI se reconoce por su código aunque llegue sin dato («vacío»)
        const celdas = ws.map((w, i) => ({
            id: w.id, ...(w.celda || { x: 0, y: fin + i * 3, cols: 12, rows: 3 }),
            minimo: FILAS_MINIMAS[w.tipo], kpi: esKpi(w)
        }));
        return this.dispositivo.esTableta ? rejillaTableta(celdas) : rejillaTelefono(celdas);
    });
    /** Tableta: medias filas de la web (74 px + 12 px = media fila de 160 px; CC-107/108): la franja de KPI mide media fila. */
    readonly altoFila = ALTO_MEDIA_FILA;
    readonly separacion = SEPARACION_WEB;
    /** Estilo grid-column / grid-row de cada widget en la rejilla. */
    estiloDe(id: string): string {
        return estiloCelda(this.rejilla()?.posiciones[id]);
    }
    readonly puertosElegibles = computed(() => this.puertos.lista());
    /** La pestaña no tiene layout de usuario ni plantilla en la BD (no se inventa una lista). */
    readonly sinLayout = computed(() => this.datos.tablero()?.layout === 'sin_layout' && !this.widgets().length);
    /** «Tu tablero» o «Tablero por defecto». */
    readonly origenLayout = computed(() => {
        const o = this.widgets().length ? this.datos.tablero()?.layout : null;
        return o === 'usuario' ? 'MOVIL.TABLERO.LAYOUT_USUARIO' : o === 'defecto' ? 'MOVIL.TABLERO.LAYOUT_DEFECTO' : '';
    });

    constructor() {
        effect(() => {
            const puerto = this.puertos.seleccionado();
            const pestana = this.pestanas.activa();
            if (this.esMapa() || this.conMarco()) return;  // el mapa trae sus propios datos; con el marco, los trae la web
            void this.datos.cargar(puerto, pestana);
        }, { allowSignalWrites: true });

        effect(() => this.gnl.seguir(this.puertos.seleccionado(), this.hayVivo() && !this.esMapa() && !this.conMarco()), { allowSignalWrites: true });
        // Al volver al tablero se intenta otra vez la web (salvo sin acceso: eso no cambia solo)
        if (this.marco.estado() === 'respaldo' && this.marco.motivo() !== 'SIN_ACCESO' && navigator.onLine !== false) this.marco.reintentar();
        // El armazón esconde su encabezado y sus pestañas mientras el marco está en pantalla (la web trae los suyos)
        effect(() => this.marco.visible.set(this.conMarco()), { allowSignalWrites: true });

        const intervalo = setInterval(() => this.recargar(false), REFRESCO_MS);
        const alVolver = () => { if (document.visibilityState === 'visible') this.recargar(false); };
        document.addEventListener('visibilitychange', alVolver);
        inject(DestroyRef).onDestroy(() => {
            clearInterval(intervalo);
            this.gnl.detener();
            this.marco.visible.set(false);
            document.removeEventListener('visibilitychange', alVolver);
        });
    }

    recargar(fresco = true): void {
        if (document.visibilityState === 'hidden' || this.esMapa() || this.conMarco()) return;
        void this.datos.cargar(this.puertos.seleccionado(), this.pestanas.activa(), fresco);
    }

    elegirPuerto(clave: string): void {
        void this.puertos.seleccionar(clave);
    }

    comoKpis(w: unknown): WidgetKpis { return w as WidgetKpis; }
    comoLista(w: unknown): WidgetLista { return w as WidgetLista; }
    comoGrafica(w: unknown): WidgetGrafica { return w as WidgetGrafica; }
    comoAnalista(w: unknown): WidgetAnalista { return w as WidgetAnalista; }
    comoMapa(w: unknown): WidgetMapa { return w as WidgetMapa; }
    /** Tarjeta vacía porque el widget no tiene versión para el teléfono (no porque falte el dato). */
    esSinVersionMovil(w: unknown): boolean { return !!(w as { sinVersionMovil?: boolean }).sinVersionMovil; }
    private brazosMemo: { brazos: string[]; todos: string; valor: OpcionSelector[] } | null = null;
    /** Opciones del selector de brazo de GNL (TODOS + los brazos con pulso); misma lista si nada cambió. */
    opcionesBrazo(todos: string): OpcionSelector[] {
        const brazos = this.gnl.brazos();
        const m = this.brazosMemo;
        if (m && m.todos === todos && m.brazos.length === brazos.length && m.brazos.every((b, i) => b === brazos[i])) return m.valor;
        const valor = [{ valor: 'TODOS', etiqueta: todos }, ...brazos.map((b) => ({ valor: b, etiqueta: b }))];
        this.brazosMemo = { brazos, todos, valor };
        return valor;
    }
    /** Componente de la app para un widget «componente» (null si la app aún no lo tiene: no se pinta nada). */
    componenteDe(w: WidgetMovil): Type<unknown> | null {
        return w.tipo === 'componente' ? COMPONENTES[w.codigo] ?? null : null;
    }
}
