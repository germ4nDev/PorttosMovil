/*
    Author: German Valencia
    Puerto seleccionado en el encabezado («Seleccione Puerto»). Aplica a todo el tablero,
    como DashboardService.puertoSeleccionado$ en la web. La lista sale de /api/puertos: ningún puerto fijo.
*/
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PUERTO_TODOS, PuertoMovil, normalizarPuertos, puertoInicial } from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';

@Injectable({ providedIn: 'root' })
export class PuertoService {
    readonly lista = signal<PuertoMovil[]>([]);
    readonly seleccionado = signal<string>('TODOS');
    readonly opciones = computed(() => [PUERTO_TODOS, ...this.lista()]);

    private opcionesMemo: { lista: PuertoMovil[]; todos: string; valor: { valor: string; etiqueta: string }[] } | null = null;
    /** Opciones para pm-selector (menú lateral y encabezado de la tableta); `todos` llega traducido. Misma lista si nada cambió. */
    opcionesSelector(todos: string): { valor: string; etiqueta: string }[] {
        const lista = this.lista();
        if (this.opcionesMemo && this.opcionesMemo.lista === lista && this.opcionesMemo.todos === todos) return this.opcionesMemo.valor;
        const valor = this.opciones().map((p) => ({ valor: p.clave, etiqueta: p.clave === PUERTO_TODOS.clave ? todos : p.clave }));
        this.opcionesMemo = { lista, todos, valor };
        return valor;
    }
    readonly cargando = signal(false);

    constructor(private http: HttpClient, private almacen: AlmacenService) {}

    async cargar(): Promise<void> {
        this.cargando.set(true);
        try {
            const resp = await firstValueFrom(this.http.get(`${environment.apiUrl}/puertos`));
            this.lista.set(normalizarPuertos(resp));
            await this.almacen.guardarJSON('puertos', this.lista());
        } catch {
            this.lista.set((await this.almacen.leerJSON<PuertoMovil[]>('puertos')) || []);
        } finally {
            this.cargando.set(false);
        }
        this.seleccionado.set(puertoInicial(this.lista(), await this.almacen.leer('puerto')));
    }

    async seleccionar(clave: string): Promise<void> {
        this.seleccionado.set(puertoInicial(this.lista(), clave));
        await this.almacen.guardar('puerto', this.seleccionado());
    }
}
