/*
    Author: German Valencia
    Tema claro / oscuro / del sistema y color de la barra superior (--app-navbar-color),
    con los mismos valores de la web (el núcleo (nucleo/).variablesTema).
*/
import { Injectable, signal } from '@angular/core';
import { COLOR_BARRA_DEFECTO, ModoTema, normalizarHex, resolverModo, textoSobre, variablesTema } from '@nucleo';
import { AlmacenService } from './almacen.service';
import { NativoService } from './nativo.service';

@Injectable({ providedIn: 'root' })
export class TemaService {
    readonly modo = signal<ModoTema>('oscuro');
    readonly efectivo = signal<'claro' | 'oscuro'>('oscuro');
    readonly colorBarra = signal<string>(COLOR_BARRA_DEFECTO);

    private consulta = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    constructor(private almacen: AlmacenService, private nativo: NativoService) {
        this.consulta?.addEventListener?.('change', () => {
            if (this.modo() === 'sistema') this.aplicar();
        });
    }

    async iniciar(): Promise<void> {
        const m = (await this.almacen.leer('tema')) as ModoTema | null;
        const c = await this.almacen.leer('colorBarra');
        if (m === 'claro' || m === 'oscuro' || m === 'sistema') this.modo.set(m);
        if (c) this.colorBarra.set(normalizarHex(c));
        this.aplicar();
    }

    async cambiarModo(m: ModoTema): Promise<void> {
        this.modo.set(m);
        this.aplicar();
        await this.almacen.guardar('tema', m);
    }

    async cambiarColorBarra(hex: string): Promise<void> {
        this.colorBarra.set(normalizarHex(hex));
        this.aplicar();
        await this.almacen.guardar('colorBarra', this.colorBarra());
    }

    private aplicar(): void {
        const efectivo = resolverModo(this.modo(), !!this.consulta?.matches);
        this.efectivo.set(efectivo);
        const raiz = document.documentElement;
        const vars = variablesTema(efectivo, this.colorBarra());
        for (const [k, v] of Object.entries(vars)) raiz.style.setProperty(k, v);
        raiz.dataset['tema'] = efectivo;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', this.colorBarra());
        void this.nativo.colorBarraEstado(this.colorBarra(), textoSobre(this.colorBarra()) === '#FFFFFF');
    }
}
