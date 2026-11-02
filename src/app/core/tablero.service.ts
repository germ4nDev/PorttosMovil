/*
    Author: German Valencia
    Tablero móvil: GET /api/movil/tablero/:puerto/:pestana. Se recarga al cambiar de puerto o de pestaña,
    cada 60 s mientras la app está abierta y al volver al primer plano. Guarda la última respuesta de cada
    puerto y pestaña para mostrarla al instante (y sin conexión) mientras llega la nueva.
*/
import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { TableroMovil } from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';

export type EstadoCarga = 'inactivo' | 'cargando' | 'listo' | 'error';

@Injectable({ providedIn: 'root' })
export class TableroService {
    readonly tablero = signal<TableroMovil | null>(null);
    readonly estado = signal<EstadoCarga>('inactivo');
    readonly error = signal('');
    /** true cuando lo que se ve es la copia guardada y no la respuesta del servidor. */
    readonly desdeCopia = signal(false);

    private pedido = 0;

    constructor(private http: HttpClient, private almacen: AlmacenService) {}

    async cargar(puerto: string, pestana: string, fresco = false): Promise<void> {
        if (!puerto || puerto === 'TODOS' || !pestana) {
            this.tablero.set(null);
            this.estado.set('inactivo');
            return;
        }
        const id = ++this.pedido;
        const llave = `tablero.${puerto}.${pestana}`;
        const actual = this.tablero();
        if (!actual || actual.puerto !== puerto || actual.pestana !== pestana) {
            const copia = await this.almacen.leerJSON<TableroMovil>(llave);
            if (id !== this.pedido) return;
            this.tablero.set(copia);
            this.desdeCopia.set(!!copia);
        }
        this.estado.set('cargando');
        this.error.set('');
        try {
            const url = `${environment.apiUrl}/movil/tablero/${encodeURIComponent(puerto)}/${encodeURIComponent(pestana)}`;
            const resp = await firstValueFrom(this.http.get<{ ok: boolean; data: TableroMovil }>(url, { params: fresco ? { fresco: '1' } : {} }));
            if (id !== this.pedido) return;
            this.tablero.set(resp.data);
            this.desdeCopia.set(false);
            this.estado.set('listo');
            await this.almacen.guardarJSON(llave, resp.data);
        } catch (e) {
            if (id !== this.pedido) return;
            const err = e as HttpErrorResponse;
            this.error.set(err?.status === 0 ? 'SIN_CONEXION' : err?.error?.msg || 'ERROR');
            this.estado.set('error');
        }
    }
}
