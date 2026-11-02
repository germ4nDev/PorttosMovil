/*
    Author: German Valencia
    Analista IA en la app (fase 3): los mismos endpoints del widget Analista IA de la web.
      GET  /api/analisis-ia/:puerto/panel                 alertas y tendencias vigentes + resumen
      GET  /api/analisis-ia/:puerto/tendencias?relevantes=1
      GET  /api/analisis-ia/:puerto/resumenes?dias=2&limite=4
      POST /api/analisis-ia/hallazgos/:id/feedback        { util }
    Se actualiza solo con el evento 'ia-hallazgo' de la sala puerto:<PUERTO>:mapa (la misma que usa la web)
    y cada 2 minutos. `conteo` alimenta la insignia de Alertas.
*/
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription, firstValueFrom } from 'rxjs';
import { Hallazgo, PanelIA, ResumenTurno, TendenciaDestacada, ordenarAlertas } from '@nucleo';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

const REFRESCO_MS = 120000;

@Injectable({ providedIn: 'root' })
export class AnalistaService {
    readonly panel = signal<PanelIA | null>(null);
    readonly tendencias = signal<TendenciaDestacada[] | null>(null);
    readonly resumenes = signal<ResumenTurno[] | null>(null);
    readonly cargando = signal(false);
    readonly error = signal(false);
    readonly alertas = computed(() => ordenarAlertas(this.panel()?.alertas || []));
    readonly conteo = computed(() => this.alertas().length);
    readonly criticas = computed(() => this.alertas().filter((a) => a.severidad === 'critica').length);

    private puerto = '';
    private sala = '';
    private sub: Subscription | null = null;
    private reloj: ReturnType<typeof setInterval> | null = null;

    constructor(private http: HttpClient, private socket: SocketService) {}

    private url(ruta: string): string {
        return `${environment.apiUrl}/analisis-ia/${ruta}`;
    }

    /** Sigue un puerto: carga el panel, se une a su sala y escucha 'ia-hallazgo'. Con TODOS se detiene. */
    seguir(puerto: string): void {
        if (puerto === this.puerto) return;
        this.detener();
        this.puerto = puerto;
        this.panel.set(null);
        this.tendencias.set(null);
        this.resumenes.set(null);
        if (!puerto || puerto === 'TODOS') return;
        this.sala = SocketService.sala(puerto, 'mapa');
        this.socket.unirse(this.sala);
        this.sub = this.socket.escuchar<{ puerto?: string }>('ia-hallazgo').subscribe((d) => {
            if (!d?.puerto || String(d.puerto).toUpperCase() === this.puerto) void this.cargarPanel();
        });
        this.reloj = setInterval(() => void this.cargarPanel(), REFRESCO_MS);
        void this.cargarPanel();
    }

    detener(): void {
        this.sub?.unsubscribe();
        this.sub = null;
        if (this.reloj) clearInterval(this.reloj);
        this.reloj = null;
        if (this.sala) this.socket.salir(this.sala);
        this.sala = '';
        this.puerto = '';
    }

    async cargarPanel(): Promise<void> {
        const p = this.puerto;
        if (!p) return;
        this.cargando.set(true);
        try {
            const r = await firstValueFrom(this.http.get<{ data: PanelIA }>(this.url(`${encodeURIComponent(p)}/panel`)));
            if (p === this.puerto) { this.panel.set(r.data); this.error.set(false); }
        } catch {
            if (p === this.puerto) this.error.set(true);
        } finally {
            this.cargando.set(false);
        }
    }

    async cargarTendencias(): Promise<void> {
        const p = this.puerto;
        if (!p) return;
        try {
            const r = await firstValueFrom(this.http.get<{ data: { disponible: boolean; destacadas?: TendenciaDestacada[] } }>(
                this.url(`${encodeURIComponent(p)}/tendencias`), { params: { relevantes: '1' } }));
            if (p === this.puerto) this.tendencias.set(r.data?.disponible ? r.data.destacadas || [] : []);
        } catch {
            if (p === this.puerto) this.tendencias.set([]);
        }
    }

    async cargarResumenes(): Promise<void> {
        const p = this.puerto;
        if (!p) return;
        try {
            const r = await firstValueFrom(this.http.get<{ data: { resumenes?: ResumenTurno[] } }>(
                this.url(`${encodeURIComponent(p)}/resumenes`), { params: { dias: '2', limite: '4' } }));
            if (p === this.puerto) this.resumenes.set(r.data?.resumenes || []);
        } catch {
            if (p === this.puerto) this.resumenes.set([]);
        }
    }

    /** «Útil» → CONFIRMADO · «No era» → FALSO. Actualiza la tarjeta sin esperar al socket. */
    async calificar(h: Hallazgo, util: boolean): Promise<boolean> {
        try {
            await firstValueFrom(this.http.post(this.url(`hallazgos/${h.id}/feedback`), { util }));
            const panel = this.panel();
            if (panel) {
                const estado = util ? 'CONFIRMADO' : 'FALSO';
                this.panel.set({ ...panel, alertas: panel.alertas.map((a) => (a.id === h.id ? { ...a, estado } : a)) });
            }
            return true;
        } catch {
            return false;
        }
    }
}
