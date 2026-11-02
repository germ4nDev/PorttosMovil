/*
    Author: German Valencia
    Ingreso con huella o Face ID (fase 4).
      - Se ofrece después de un ingreso normal con usuario y clave; si el usuario acepta, se confirma con la biometría
        y las credenciales quedan cifradas en el Keychain / Keystore del teléfono (AlmacenService.guardarSeguro).
      - Para entrar: biometría → credenciales → el mismo POST /api/auth de siempre (crea la sesión única del usuario).
      - Si el servidor rechaza esas credenciales (cambio de clave), se borran y se vuelve al ingreso normal.
      - Se puede desactivar en Ajustes. Nada de esto existe en el navegador.
*/
import { Injectable, computed, signal } from '@angular/core';
import { AlmacenService } from './almacen.service';
import { NativoService, TipoBiometria } from './nativo.service';

interface Credenciales { usuario: string; clave: string; }

@Injectable({ providedIn: 'root' })
export class BiometriaService {
    readonly disponible = signal(false);
    readonly tipo = signal<TipoBiometria>('ninguna');
    readonly activa = signal(false);
    private readonly rechazada = signal(false);
    readonly ofrecer = computed(() => this.disponible() && !this.activa() && !this.rechazada());

    private iniciado: Promise<void> | null = null;

    constructor(private almacen: AlmacenService, private nativo: NativoService) {}

    iniciar(): Promise<void> {
        if (!this.iniciado) {
            this.iniciado = (async () => {
                const b = await this.nativo.biometria();
                this.disponible.set(b.disponible);
                this.tipo.set(b.tipo);
                this.activa.set(b.disponible && (await this.almacen.leer('bio.activa')) === '1');
                this.rechazada.set((await this.almacen.leer('bio.rechazada')) === '1');
            })();
        }
        return this.iniciado;
    }

    /** Guarda las credenciales cifradas después de confirmar con la biometría. */
    async activar(usuario: string, clave: string, motivo: string): Promise<boolean> {
        if (!this.disponible()) return false;
        if (!(await this.nativo.autenticarBiometria(motivo))) return false;
        if (!(await this.almacen.guardarSeguro('credenciales', { usuario, clave } as Credenciales))) return false;
        await this.almacen.guardar('bio.activa', '1');
        this.activa.set(true);
        return true;
    }

    /** Pide la biometría y devuelve las credenciales (o null si se canceló o no hay). */
    async obtener(motivo: string): Promise<Credenciales | null> {
        if (!this.activa()) return null;
        if (!(await this.nativo.autenticarBiometria(motivo))) return null;
        const c = await this.almacen.leerSeguro<Credenciales>('credenciales');
        if (!c?.usuario || !c?.clave) {
            await this.desactivar();
            return null;
        }
        return c;
    }

    async desactivar(): Promise<void> {
        await this.almacen.borrarSeguro('credenciales');
        await this.almacen.borrar('bio.activa');
        this.activa.set(false);
    }

    /** Desde Ajustes: volver a ofrecerla en el próximo ingreso con usuario y clave. */
    async reofrecer(): Promise<void> {
        this.rechazada.set(false);
        await this.almacen.borrar('bio.rechazada');
    }

    async noGracias(): Promise<void> {
        this.rechazada.set(true);
        await this.almacen.guardar('bio.rechazada', '1');
    }
}
