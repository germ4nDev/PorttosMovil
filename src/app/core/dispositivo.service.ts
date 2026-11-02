/*
    Author: German Valencia
    Teléfono o tableta, y su orientación fija. Se decide una vez al arrancar
    por el lado corto de la pantalla (no cambia si el usuario gira el equipo).
*/
import { Injectable, signal } from '@angular/core';
import { ClaseDispositivo, claseDispositivo, orientacionObjetivo } from '@nucleo';
import { NativoService } from './nativo.service';

@Injectable({ providedIn: 'root' })
export class DispositivoService {
    readonly clase = signal<ClaseDispositivo>(this.medir());

    constructor(private nativo: NativoService) {}

    async iniciar(): Promise<void> {
        const c = this.medir();
        this.clase.set(c);
        document.documentElement.dataset['dispositivo'] = c;
        await this.nativo.bloquearOrientacion(orientacionObjetivo(c));
    }

    get esTableta(): boolean {
        return this.clase() === 'tableta';
    }

    private medir(): ClaseDispositivo {
        const s = window.screen;
        const ancho = s?.width || window.innerWidth;
        const alto = s?.height || window.innerHeight;
        return claseDispositivo(ancho, alto);
    }
}
