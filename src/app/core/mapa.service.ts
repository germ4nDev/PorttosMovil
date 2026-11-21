/*
    Author: German Valencia
    Mapa logístico (fase 4): GET /api/movil/mapa/:puerto cada 20 s mientras el mapa está a la vista.
    Guarda la última respuesta por puerto para pintar al instante (y sin conexión).
    CC-243: capas del usuario en el canal teléfono (GET/PUT /api/capas-mapa/mias): las que permite su rol y su preferencia,
    con copia local para pintar sin conexión.
*/
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CapasMapaMias, MapaMovil } from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';

const REFRESCO_MS = 20000;

@Injectable({ providedIn: 'root' })
export class MapaService {
    readonly mapa = signal<MapaMovil | null>(null);
    readonly error = signal(false);
    readonly cargando = signal(false);
    /** null = sin respuesta del API (sin red o sin la 055): la vista nativa muestra todas sus capas */
    readonly capasMias = signal<CapasMapaMias | null>(null);

    private puerto = '';
    private reloj: ReturnType<typeof setInterval> | null = null;

    constructor(private http: HttpClient, private almacen: AlmacenService) {}

    async seguir(puerto: string): Promise<void> {
        this.detener();
        this.puerto = puerto;
        if (!puerto || puerto === 'TODOS') { this.mapa.set(null); return; }
        const copia = await this.almacen.leerJSON<MapaMovil>(`mapa.${puerto}`);
        if (this.puerto === puerto && copia) this.mapa.set(copia);
        this.reloj = setInterval(() => { if (document.visibilityState !== 'hidden') void this.cargar(); }, REFRESCO_MS);
        await this.cargar();
    }

    async cargarCapas(): Promise<void> {
        const copia = await this.almacen.leerJSON<CapasMapaMias>('mapa.capas');
        if (copia) this.capasMias.set(copia);
        try {
            const r = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/capas-mapa/mias`, { params: { canal: 'telefono' } }));
            const mias: CapasMapaMias = { capas: r?.capas || [], vista: r?.vista ?? null };
            this.capasMias.set(mias);
            await this.almacen.guardarJSON('mapa.capas', mias);
        } catch { /* se queda con la copia o con null */ }
    }

    async guardarCapas(estado: Record<string, boolean>): Promise<void> {
        const actual = this.capasMias();
        if (!actual) return;
        const mias: CapasMapaMias = { capas: actual.capas.map((c) => ({ ...c, visible: !!estado[c.codigo] })), vista: null };
        this.capasMias.set(mias);
        await this.almacen.guardarJSON('mapa.capas', mias);
        try {
            await firstValueFrom(this.http.put<any>(`${environment.apiUrl}/capas-mapa/mias`, { canal: 'telefono', estado, vista: null }));
        } catch { /* sin conexión: queda en el dispositivo y se vuelve a pedir al abrir */ }
    }

    detener(): void {
        if (this.reloj) clearInterval(this.reloj);
        this.reloj = null;
        this.puerto = '';
    }

    async cargar(): Promise<void> {
        const p = this.puerto;
        if (!p) return;
        this.cargando.set(true);
        try {
            const r = await firstValueFrom(this.http.get<{ data: MapaMovil }>(`${environment.apiUrl}/movil/mapa/${encodeURIComponent(p)}`));
            if (p !== this.puerto) return;
            this.mapa.set(r.data);
            this.error.set(false);
            await this.almacen.guardarJSON(`mapa.${p}`, r.data);
        } catch {
            if (p === this.puerto) this.error.set(true);
        } finally {
            this.cargando.set(false);
        }
    }
}
