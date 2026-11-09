/*
    Author: German Valencia
    Selector de la app (2026-10-25): reemplaza las listas <select> nativas, que en Android abren el cuadro del sistema
    (blanco, con radios) sin los estilos de la app. Pedido del usuario: «esa lista de puertos se ve muy mal, debería
    comportarse de acuerdo a los estilos de la app».
      - Botón con tres variantes: «campo» (menú lateral), «barra» (encabezado de la tableta) y «pildora» (brazo de GNL).
      - Al tocarlo sube una hoja desde abajo con los colores del tema (claro u oscuro): título, opciones de 48 px, la elegida
        marcada con el color de acento y ✓, velo oscuro. Se cierra con el velo, con ✕, con Escape o al elegir.
      - La hoja se monta en <body>: el menú lateral se desliza con transform y atraparía cualquier capa position: fixed.
      - Accesible: botón con aria-haspopup/aria-expanded, lista role=listbox con opciones role=option y aria-selected;
        al abrir enfoca la opción elegida y al cerrar devuelve el foco al botón.
*/
import {
    ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, ViewChild, computed, signal,
} from '@angular/core';
import { IconoComponent } from '../icono/icono.component';

export interface OpcionSelector { valor: string; etiqueta: string; }

let consecutivo = 0;

@Component({
    selector: 'pm-selector',
    standalone: true,
    imports: [IconoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './selector.component.html',
    styleUrl: './selector.component.scss',
})
export class SelectorComponent implements OnChanges, OnDestroy {
    @Input({ required: true }) opciones: OpcionSelector[] = [];
    @Input({ required: true }) valor = '';
    /** Título de la hoja y nombre accesible del botón (ya traducido). */
    @Input({ required: true }) titulo = '';
    @Input() icono = '';
    @Input() variante: 'campo' | 'barra' | 'pildora' = 'campo';
    @Input() textoCerrar = 'Cerrar';
    @Output() readonly cambio = new EventEmitter<string>();

    @ViewChild('disparador', { static: true }) disparador!: ElementRef<HTMLButtonElement>;
    /** Cuando la hoja aparece, se mueve a <body> y se enfoca la opción elegida. */
    @ViewChild('capa') set capa(e: ElementRef<HTMLElement> | undefined) {
        const el = e?.nativeElement;
        if (!el || el === this.capaEl) return;
        this.capaEl = el;
        document.body.appendChild(el);
        queueMicrotask(() => {
            const activa = el.querySelector<HTMLElement>('.opcion--activa') || el.querySelector<HTMLElement>('.opcion');
            activa?.scrollIntoView({ block: 'center' });
            activa?.focus({ preventScroll: true });
        });
    }

    readonly abierto = signal(false);
    readonly idTitulo = `pm-selector-${++consecutivo}`;
    private capaEl: HTMLElement | null = null;
    private readonly valorSig = signal('');
    private readonly opcionesSig = signal<OpcionSelector[]>([]);
    readonly etiquetaActual = computed(() => this.opcionesSig().find((o) => o.valor === this.valorSig())?.etiqueta ?? this.valorSig());

    ngOnChanges(): void {
        this.valorSig.set(this.valor);
        this.opcionesSig.set(this.opciones || []);
    }

    abrir(): void {
        this.abierto.set(true);
    }

    cerrar(): void {
        if (!this.abierto()) return;
        this.abierto.set(false);
        this.capaEl = null;
        this.disparador.nativeElement.focus({ preventScroll: true });
    }

    elegir(v: string): void {
        if (v !== this.valor) this.cambio.emit(v);
        this.cerrar();
    }

    ngOnDestroy(): void {
        this.capaEl?.remove();
    }
}
