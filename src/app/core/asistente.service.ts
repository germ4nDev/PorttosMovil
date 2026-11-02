/*
    Author: German Valencia
    Asistente de Porttos en la app (fase 3): mismo endpoint y mismo marco de alcance que el chat de la web.
      POST /api/analisis-ia/asistente/preguntar               { pregunta, puerto, pestana, historial (4 turnos) }
      POST /api/analisis-ia/asistente/preguntas/:id/feedback  { util }
    La conversación vive en memoria (se borra al cerrar sesión o con «Nueva»).
*/
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { RespuestaAsistente, historialAsistente } from '@nucleo';
import { environment } from '../../environments/environment';

export interface Turno {
    pregunta: string;
    respuesta: RespuestaAsistente | null;
    error: string;
    pendiente: boolean;
    voto: boolean | null;
    hora: string;
}

@Injectable({ providedIn: 'root' })
export class AsistenteService {
    readonly turnos = signal<Turno[]>([]);
    readonly ocupado = signal(false);

    constructor(private http: HttpClient) {}

    private generacion = 0;

    nueva(): void {
        this.generacion++;
        this.turnos.set([]);
        this.ocupado.set(false);
    }

    async preguntar(pregunta: string, puerto: string, pestana: string): Promise<void> {
        const texto = pregunta.trim();
        if (!texto || this.ocupado()) return;
        const historial = historialAsistente(this.turnos());
        const ahora = new Date();
        const turno: Turno = {
            pregunta: texto, respuesta: null, error: '', pendiente: true, voto: null,
            hora: `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`
        };
        this.turnos.set([...this.turnos(), turno]);
        const indice = this.turnos().length - 1;
        const gen = this.generacion;
        this.ocupado.set(true);
        const actualizar = (cambio: Partial<Turno>) => {
            if (gen !== this.generacion) return;           // «Nueva» mientras esperaba: se descarta
            this.turnos.update((l) => l.map((t, j) => (j === indice ? { ...t, ...cambio } : t)));
        };
        try {
            const r = await firstValueFrom(this.http.post<{ data: RespuestaAsistente }>(`${environment.apiUrl}/analisis-ia/asistente/preguntar`, {
                pregunta: texto.slice(0, 1000),
                puerto: puerto && puerto !== 'TODOS' ? puerto : null,
                pestana: pestana || null,
                historial
            }));
            actualizar({ respuesta: r.data, pendiente: false });
        } catch (e) {
            const err = e as HttpErrorResponse;
            actualizar({ pendiente: false, error: err?.status === 0 ? 'SIN_CONEXION' : err?.error?.msg || 'ERROR' });
        } finally {
            if (gen === this.generacion) this.ocupado.set(false);
        }
    }

    async votar(indice: number, util: boolean): Promise<void> {
        const t = this.turnos()[indice];
        if (!t?.respuesta?.id || t.voto !== null) return;
        const poner = (voto: boolean | null) => this.turnos.update((l) => l.map((x, j) => (j === indice ? { ...x, voto } : x)));
        poner(util);
        try {
            await firstValueFrom(this.http.post(`${environment.apiUrl}/analisis-ia/asistente/preguntas/${t.respuesta.id}/feedback`, { util }));
        } catch {
            poner(null);
        }
    }
}
