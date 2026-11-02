/*
    Author: German Valencia
    Pestañas de la Torre de Control del usuario: el maestro de /api/pestanas/:suite/:aplicacion
    y las preferencias de /api/layout/pestanas/user/:codigoUsuario (solo lectura), ordenadas con la
    misma regla de la web (el núcleo (nucleo/).ordenarPestanas). Sin red, usa la última copia guardada.
*/
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PestanaMaestra, estiloPestana, ordenarPestanas, pestanaInicial } from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';
import { SesionService } from './sesion.service';

@Injectable({ providedIn: 'root' })
export class PestanasService {
    readonly visibles = signal<PestanaMaestra[]>([]);
    readonly activa = signal<string>('');
    readonly activaInfo = computed(() => {
        const p = this.visibles().find((x) => x.codigoPestana === this.activa());
        return p ? { ...p, estilo: estiloPestana(p.codigoPestana, p) } : null;
    });

    constructor(private http: HttpClient, private almacen: AlmacenService, private sesion: SesionService) {}

    async cargar(): Promise<void> {
        const cache = await this.almacen.leerJSON<PestanaMaestra[]>('pestanas');
        try {
            const usuario = this.sesion.sesion()?.codigoUsuario || '';
            const maestro: any = await firstValueFrom(
                this.http.get(`${environment.apiUrl}/pestanas/${environment.codigoSuite}/${environment.codigoAplicacion}`)
            );
            const prefs: any = usuario
                ? await firstValueFrom(this.http.get(`${environment.apiUrl}/layout/pestanas/user/${usuario}`)).catch(() => null)
                : null;
            const lista = maestro?.success && Array.isArray(maestro.data) ? maestro.data : [];
            const visibles = ordenarPestanas(lista, prefs?.ok ? prefs.data : null, cache);
            this.visibles.set(visibles);
            await this.almacen.guardarJSON('pestanas', visibles);
        } catch {
            this.visibles.set(cache || []);
        }
        this.activa.set(pestanaInicial(this.visibles(), await this.almacen.leer('pestanaActiva')));
    }

    async activar(codigo: string): Promise<void> {
        this.activa.set(pestanaInicial(this.visibles(), codigo));
        await this.almacen.guardar('pestanaActiva', this.activa());
    }
}
