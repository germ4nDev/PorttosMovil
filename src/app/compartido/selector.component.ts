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
import { IconoComponent } from './icono.component';

export interface OpcionSelector { valor: string; etiqueta: string; }

let consecutivo = 0;

@Component({
    selector: 'pm-selector',
    standalone: true,
    imports: [IconoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <button #disparador type="button" class="disparador" [class]="'disparador disparador--' + variante"
            aria-haspopup="listbox" [attr.aria-expanded]="abierto()" [attr.aria-label]="titulo + ': ' + etiquetaActual()"
            (click)="abrir()">
      @if (icono) { <pm-icono class="disparador__icono" [nombre]="icono" [tam]="variante === 'pildora' ? 13 : 16"></pm-icono> }
      <span class="disparador__texto">{{ etiquetaActual() }}</span>
      <pm-icono class="disparador__flecha" nombre="flechaAbajo" [tam]="variante === 'pildora' ? 12 : 14"></pm-icono>
    </button>

    @if (abierto()) {
      <div #capa class="capa" (keydown.escape)="cerrar()">
        <div class="capa__velo" (click)="cerrar()" aria-hidden="true"></div>
        <section class="hoja" role="dialog" aria-modal="true" [attr.aria-labelledby]="idTitulo">
          <span class="hoja__agarre" aria-hidden="true"></span>
          <header class="hoja__cabeza">
            <h2 [id]="idTitulo">{{ titulo }}</h2>
            <button type="button" class="hoja__cerrar" (click)="cerrar()" [attr.aria-label]="textoCerrar">
              <pm-icono nombre="cerrarX" [tam]="18"></pm-icono>
            </button>
          </header>
          <ul class="hoja__lista" role="listbox" [attr.aria-labelledby]="idTitulo">
            @for (o of opciones; track o.valor) {
              <li role="none">
                <button type="button" role="option" class="opcion" [class.opcion--activa]="o.valor === valor"
                        [attr.aria-selected]="o.valor === valor" [attr.data-valor]="o.valor" (click)="elegir(o.valor)">
                  <span>{{ o.etiqueta }}</span>
                  @if (o.valor === valor) { <pm-icono nombre="check" [tam]="18"></pm-icono> }
                </button>
              </li>
            }
          </ul>
        </section>
      </div>
    }
    `,
    styles: [`
    :host { display: block; min-width: 0; }

    /* ---------------- botón */
    .disparador { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; min-width: 0; margin: 0;
      font: inherit; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; text-align: left; cursor: pointer; }
    .disparador__texto { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .disparador__icono, .disparador__flecha { flex: none; color: var(--pt-subtitulo); }
    .disparador:focus-visible { outline: 2px solid var(--pt-info); outline-offset: 1px; }
    .disparador[aria-expanded='true'] .disparador__flecha { transform: rotate(180deg); }
    /* Menú lateral: campo de 46 px como los del ingreso */
    .disparador--campo { height: 46px; padding: 0 12px; border-radius: 8px; border: 1px solid var(--pt-borde);
      background: var(--pt-tarjeta-2); color: var(--pt-texto-fuerte); font-size: 14px; }
    .disparador--campo[aria-expanded='true'] { border-color: var(--pt-info); }
    /* Encabezado de la tableta: caja oscura sobre la barra de color (clara con el tema claro), como la web */
    .disparador--barra { height: 36px; min-width: 170px; padding: 0 10px 0 12px; border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, .12); background: #2B2B2B; color: #FFFFFF; font-size: 13px; }
    .disparador--barra .disparador__flecha { color: #FFFFFF; }
    :host-context([data-tema='claro']) .disparador--barra { background: #FFFFFF; color: #212529; border-color: #CECDCD; }
    :host-context([data-tema='claro']) .disparador--barra .disparador__flecha { color: #212529; }
    /* GNL: píldora pequeña junto al estado de conexión */
    .disparador--pildora { height: 28px; max-width: 140px; padding: 0 8px 0 10px; gap: 5px; border-radius: 14px;
      border: 1px solid var(--pt-borde); background: var(--pt-tarjeta-2); color: var(--pt-texto); font-size: 11.5px; }

    /* ---------------- hoja (montada en <body>) */
    .capa { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: flex-end; justify-content: center; }
    .capa__velo { position: absolute; inset: 0; background: rgba(0, 0, 0, .55); animation: aparecer .18s ease; }
    .hoja { position: relative; width: 100%; max-width: 480px; max-height: min(72vh, 560px); display: flex; flex-direction: column;
      box-sizing: border-box; padding: 8px 0 calc(var(--pt-seguro-abajo, 0px) + 10px);
      background: var(--pt-tarjeta); color: var(--pt-texto); border: 1px solid var(--pt-borde); border-bottom: 0;
      border-radius: 18px 18px 0 0; box-shadow: 0 -12px 40px rgba(0, 0, 0, .45); animation: subir .2s ease; }
    .hoja__agarre { align-self: center; width: 40px; height: 4px; border-radius: 2px; background: var(--pt-borde); margin-bottom: 4px; }
    .hoja__cabeza { display: flex; align-items: center; gap: 8px; padding: 4px 8px 8px 20px; border-bottom: 1px solid var(--pt-borde); }
    .hoja__cabeza h2 { flex: 1; margin: 0; font-size: 12px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; color: var(--pt-subtitulo); }
    .hoja__cerrar { width: 40px; height: 40px; border: 0; border-radius: 10px; background: transparent; color: var(--pt-subtitulo);
      display: flex; align-items: center; justify-content: center; }
    .hoja__lista { list-style: none; margin: 0; padding: 6px 10px; overflow-y: auto; overscroll-behavior: contain; }
    .opcion { width: 100%; min-height: 48px; display: flex; align-items: center; gap: 10px; padding: 0 12px; margin: 1px 0;
      border: 0; border-radius: 8px; background: transparent; color: var(--pt-texto); font: inherit; font-size: 14.5px;
      font-weight: 500; text-align: left; text-transform: uppercase; letter-spacing: .02em; }
    .opcion span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .opcion:active { background: var(--pt-tarjeta-2); }
    .opcion:focus-visible { outline: 2px solid var(--pt-info); outline-offset: -2px; }
    .opcion--activa { background: var(--pt-tarjeta-2); color: var(--pt-info); font-weight: 700; box-shadow: inset 3px 0 0 var(--pt-info); }
    @keyframes subir { from { transform: translateY(100%); } to { transform: none; } }
    @keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .hoja, .capa__velo { animation: none; } }
    `],
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
