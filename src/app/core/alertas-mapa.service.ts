/*
    Author: German Valencia
    Alertas del mapa (OT-007, 2026-10-29): el mismo canal que la web (alertas-mapa.service.ts).
    Al abrir el mapa entra a la sala puerto:<PUERTO>:mapa, carga la bitácora vigente (GET /api/alertas-mapa) y escucha
    'alerta-mapa'. Las que llegan con el mapa abierto cuentan como sin leer y se avisan por `nueva` (el mapa pinta un pulso).
    También entra a puerto:<PUERTO>:maritimo: el motor AIS solo rastrea los puertos que alguien está mirando (como la web).
*/
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subject, Subscription, firstValueFrom } from 'rxjs';
import { AlertaMapa, MAX_BITACORA_MAPA, alertaValida, esDelPuerto, fusionarAlertas, normalizarPuertoMapa } from '@nucleo';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

@Injectable({ providedIn: 'root' })
export class AlertasMapaService {
    private readonly http = inject(HttpClient);
    private readonly socket = inject(SocketService);

    readonly bitacora = signal<AlertaMapa[]>([]);
    private readonly vistos = signal<ReadonlySet<string>>(new Set());
    readonly sinLeer = computed(() => this.bitacora().filter((a) => !this.vistos().has(a.id)).length);
    /** Cada alerta que llega en vivo (para el pulso en el mapa). */
    readonly nueva = new Subject<AlertaMapa>();

    private puerto = '';
    private salas: string[] = [];
    private sub: Subscription | null = null;

    seguir(puerto: string): void {
        const clave = normalizarPuertoMapa(puerto);
        if (!clave || clave === 'TODOS' || clave === 'ALL') { this.detener(); return; }
        if (clave === this.puerto && this.sub) return;
        this.detener();
        this.puerto = clave;
        this.salas = [SocketService.sala(clave, 'mapa'), SocketService.sala(clave, 'maritimo')];
        this.salas.forEach((s) => this.socket.unirse(s));
        this.sub = this.socket.escuchar<unknown>('alerta-mapa').subscribe((a) => this.recibir(a));
        void this.cargarBitacora(clave);
    }

    detener(): void {
        this.sub?.unsubscribe();
        this.sub = null;
        this.salas.forEach((s) => this.socket.salir(s));
        this.salas = [];
        this.puerto = '';
        this.bitacora.set([]);
        this.vistos.set(new Set());
    }

    /** Al abrir la lista: todo lo visible queda leído. */
    marcarLeidas(): void {
        this.vistos.set(new Set(this.bitacora().map((a) => a.id)));
    }

    private async cargarBitacora(puerto: string): Promise<void> {
        try {
            const params = new HttpParams({ fromObject: { puerto, limite: String(MAX_BITACORA_MAPA) } });
            const lista = await firstValueFrom(this.http.get<unknown>(`${environment.apiUrl}/alertas-mapa`, { params }));
            if (puerto !== this.puerto) return;
            const validas = (Array.isArray(lista) ? lista : []).filter(alertaValida);
            // Lo anterior a abrir el mapa no cuenta como nuevo (igual que la web)
            this.vistos.set(new Set([...this.vistos(), ...validas.map((a) => a.id)]));
            this.bitacora.set(fusionarAlertas(this.bitacora(), validas));
        } catch {
            // Sin bitácora (sin red o sin migración 011): quedan solo las que lleguen en vivo
        }
    }

    private recibir(a: unknown): void {
        if (!alertaValida(a) || !this.puerto || !esDelPuerto(a, this.puerto)) return;
        this.bitacora.set(fusionarAlertas(this.bitacora(), [a]));
        this.nueva.next(a);
    }
}
