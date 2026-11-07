/*
    Author: German Valencia
    Marco de la web (OT-014 fase 2, CC-110; regla 17: la tableta = la web; OT-017: también el teléfono, con canal 'telefono').
    La página Tablero de la tableta muestra la Torre de Control de la web (`<webUrl>/embebido`) en un marco y le entrega la sesión
    de la app (la misma: sesión única). Contrato y validaciones en `@nucleo` (marco-web.ts); la web tiene el suyo igual.
      - 'listo'          → se manda la sesión con la aplicación y la suite del tablero y el último puerto y pestaña.
      - 'estado'         → la web cargó: se guarda el puerto y la pestaña para la próxima apertura.
      - 'cerrar-sesion'  → el cierre de siempre de la app (usuario, expirada, reemplazada); 'sin-acceso' → vista nativa.
      - 'error', sin conexión o sin respuesta en ESPERA_MARCO_MS → vista nativa rotulada (respaldo), con «Reintentar».
    El teléfono usa el marco desde OT-017: la web pinta su rejilla de 4 columnas con los widgets de teléfono. Su vista nativa
    (KPI de a 2) queda de respaldo, igual que en la tableta.
*/
import { Injectable, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
    ESPERA_MARCO_MS, EstadoMarco, canalDeDispositivo, leerMensajeWeb, mensajeSesionParaWeb, motivoCierreDeWeb, origenDeUrl, urlMarcoWeb,
    usarMarcoWeb
} from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';
import { DispositivoService } from './dispositivo.service';
import { SesionService } from './sesion.service';

export type EstadoMarcoWeb = 'cargando' | 'listo' | 'respaldo';
/** Por qué la tableta muestra la vista nativa: llave de i18n MOVIL.MARCO.<motivo>. */
export type MotivoRespaldo = 'SIN_CONEXION' | 'SIN_RESPUESTA' | 'ERROR' | 'SIN_ACCESO';

const LLAVE_ULTIMO = 'marcoEstado';

@Injectable({ providedIn: 'root' })
export class MarcoWebService {
    private readonly sesion = inject(SesionService);
    private readonly almacen = inject(AlmacenService);
    private readonly dispositivo = inject(DispositivoService);
    private readonly webUrl = (environment as { webUrl?: string }).webUrl || '';
    private readonly origenWeb = origenDeUrl(this.webUrl);

    readonly url: SafeResourceUrl | null;
    /** Tableta y teléfono usan el marco (con una web configurada). */
    readonly usar = computed(() => usarMarcoWeb(this.webUrl));
    readonly estado = signal<EstadoMarcoWeb>('cargando');
    readonly motivo = signal<MotivoRespaldo | null>(null);
    /** El marco está en pantalla: el armazón esconde su encabezado y sus pestañas (la web trae los suyos). */
    readonly visible = signal(false);
    /** Último puerto y pestaña de la web (para abrir donde se quedó). */
    readonly ultimo = signal<EstadoMarco | null>(null);

    private marco: HTMLIFrameElement | null = null;
    private espera: ReturnType<typeof setTimeout> | null = null;

    constructor() {
        const texto = urlMarcoWeb(this.webUrl);
        this.url = texto ? inject(DomSanitizer).bypassSecurityTrustResourceUrl(texto) : null;
        window.addEventListener('message', (ev) => this.alMensaje(ev));
        window.addEventListener('offline', () => { if (this.visible() && this.estado() !== 'respaldo') this.respaldo('SIN_CONEXION'); });
        window.addEventListener('online', () => { if (this.motivo() === 'SIN_CONEXION') this.reintentar(); });
        void this.almacen.leerJSON<EstadoMarco>(LLAVE_ULTIMO).then((u) => { if (u && !this.ultimo()) this.ultimo.set(u); });
    }

    /** La página registra el marco al pintarlo; null al quitarlo. */
    registrar(marco: HTMLIFrameElement | null): void {
        this.limpiarEspera();
        this.marco = marco;
        if (!marco) return;
        if (typeof navigator !== 'undefined' && navigator.onLine === false) { this.respaldo('SIN_CONEXION'); return; }
        this.estado.set('cargando');
        this.espera = setTimeout(() => { if (this.estado() === 'cargando') this.respaldo('SIN_RESPUESTA'); }, ESPERA_MARCO_MS);
    }

    reintentar(): void {
        this.motivo.set(null);
        this.estado.set('cargando');
    }

    private alMensaje(ev: MessageEvent): void {
        if (!this.marco || ev.source !== this.marco.contentWindow) return;
        const m = leerMensajeWeb(ev.data, ev.origin, this.origenWeb);
        if (!m) return;
        if (m.tipo === 'listo') {
            const s = this.sesion.sesion();
            if (!s) return;
            const mensaje = mensajeSesionParaWeb(s,
                { codigoAplicacion: environment.codigoAplicacion, codigoSuite: environment.codigoSuite }, this.ultimo(),
                canalDeDispositivo(this.dispositivo.clase() === 'tableta'));
            this.marco.contentWindow?.postMessage(mensaje, this.origenWeb);
        } else if (m.tipo === 'estado') {
            this.limpiarEspera();
            this.estado.set('listo');
            const u = { puerto: m.puerto, pestana: m.pestana };
            this.ultimo.set(u);
            void this.almacen.guardarJSON(LLAVE_ULTIMO, u);
        } else if (m.tipo === 'cerrar-sesion') {
            const motivo = motivoCierreDeWeb(m.motivo);
            if (motivo) void this.sesion.cerrar(motivo);
            else this.respaldo('SIN_ACCESO');
        } else {
            this.respaldo('ERROR');
        }
    }

    private respaldo(motivo: MotivoRespaldo): void {
        this.limpiarEspera();
        this.motivo.set(motivo);
        this.estado.set('respaldo');
    }

    private limpiarEspera(): void {
        if (this.espera) clearTimeout(this.espera);
        this.espera = null;
    }
}
