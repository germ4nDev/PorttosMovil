/*
    Author: German Valencia
    Tacómetro de presión GNL (PTT_GNL_GAUGE_PRESION), igual a gnl-gauge-widget de la web (OT-005): mismo SVG (arco de 110 px
    sobre viewBox 100×50), aguja de −90° a +90° para 0–100 psi, semáforo (rojo con alarma o ≥ 75 psi, naranja 72–75, azul
    criogénico), insignia del brazo y temperatura del ducto. Datos: GnlVivoService (socket, brazo elegido).
    La tarjeta móvil hace de marco (título, subtítulo e ícono de la web); el tamaño se adapta a la celda.
*/
import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { GAUGE_GNL, WidgetComponente, colorGaugeGnl, geometriaGaugeGnl } from '@nucleo';
import { GnlVivoService } from '../../core/gnl-vivo.service';
import { IconoComponent } from '../../compartido/icono.component';

@Component({
    selector: 'pm-gnl-gauge',
    standalone: true,
    imports: [DecimalPipe, IconoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
    <section class="pt-tarjeta gnl">
      <header class="gnl__cabeza">
        <pm-icono nombre="medidor" [tam]="16"></pm-icono>
        <div class="gnl__textos">
          <h2 class="pt-tarjeta__titulo">{{ w.titulo }}</h2>
          @if (w.subtitulo) { <p class="pt-tarjeta__sub gnl__sub">{{ w.subtitulo }}</p> }
        </div>
        <span class="insignia">{{ brazo() }}</span>
        <span class="status-dot" [style.background-color]="color()" [class.blinking]="color() === peligro"></span>
      </header>

      <div class="gauge-body">
        <div class="gauge-container" [style.--color-estado]="color()" [class.estado-peligro]="color() === peligro">
          <svg class="gauge-svg" viewBox="0 0 100 50" aria-hidden="true">
            <path d="M 15 45 A 35 35 0 0 1 85 45" fill="none" stroke-width="7" stroke-linecap="round" stroke="#2b2b40"></path>
            <path d="M 15 45 A 35 35 0 0 1 85 45" fill="none" stroke-width="7" stroke-linecap="round" [attr.stroke]="color()"
                  [attr.stroke-dasharray]="geometria().dashArray" style="transition: stroke-dasharray 0.4s ease-in-out, stroke 0.4s ease-in-out;"></path>
          </svg>
          <div class="gauge-needle" [style.transform]="'rotate(' + geometria().angulo + 'deg)'"></div>
          <div class="gauge-value" [style.borderColor]="color() === normal ? 'rgba(255,255,255,0.08)' : color()"
               [style.backgroundColor]="color() === normal ? 'rgba(20, 20, 30, 0.85)' : color() + '1A'">
            <span class="numero" [style.color]="color()">{{ presion() | number: '1.2-2' }}</span>
            <span class="unidad" [style.color]="color() === normal ? '#a1a5b7' : color()">PSI</span>
          </div>
        </div>
      </div>

      <footer class="scada-footer">
        <span class="temp-label">Temp. Ducto:</span>
        <span class="temp-value">{{ temperatura() | number: '1.2-2' }} °C</span>
      </footer>
    </section>
    `,
    styles: [`
    :host { display: block; min-width: 0; height: 100%; min-height: 0; }
    .gnl { height: 100%; box-sizing: border-box; display: flex; flex-direction: column; padding: 10px 12px; overflow: hidden; }
    .gnl__cabeza { display: flex; align-items: center; gap: 8px; color: var(--pt-texto); }
    .gnl__textos { flex: 1; min-width: 0; }
    /* Título y subtítulo en una línea: la celda del teléfono es baja y el medidor o la gráfica necesitan el alto */
    .gnl__textos h2, .gnl__textos p { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .gnl__sub { text-transform: uppercase; }
    .insignia { background: #212529; color: #fff; border-radius: 4px; padding: 2px 6px; font-size: 10px; font-weight: 600; text-transform: uppercase; white-space: nowrap; }
    .status-dot { width: 10px; height: 10px; border-radius: 50%; flex: none; }
    .status-dot.blinking { animation: blink 1s infinite alternate; }
    .gauge-body { flex: 1; display: flex; justify-content: center; align-items: center; min-height: 0; padding: 6px 0 4px; container-type: size; }
    /* Proporción 2:1 del SVG, del tamaño que quepa en la celda (ancho o alto, lo que limite primero) */
    .gauge-container { width: min(100cqw, 200cqh, 500px); aspect-ratio: 2 / 1; position: relative; margin: 0 auto; display: flex; justify-content: center; }
    .gauge-svg { width: 100%; height: 100%; overflow: visible; }
    .gauge-needle { position: absolute; bottom: 0; left: 50%; width: 3px; height: 70%; background: var(--color-estado);
      transform-origin: bottom center; margin-left: -1.5px; border-radius: 3px 3px 0 0;
      transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.4s ease; z-index: 10; }
    .gauge-needle::after { content: ''; position: absolute; bottom: -5px; left: -4.5px; width: 12px; height: 12px; background: #ffffff;
      border: 2px solid var(--color-estado); border-radius: 50%; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3); transition: border-color 0.4s ease; }
    .gauge-container.estado-peligro .gauge-needle { animation: pulso-aguja 1s infinite alternate; box-shadow: 0 0 15px rgba(255, 71, 87, 0.8); }
    .gauge-value { position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); display: flex; align-items: baseline; gap: 4px;
      border: 1px solid transparent; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05); padding: 2px 10px; border-radius: 12px; z-index: 1; }
    .gauge-value .numero { font-size: clamp(.9rem, 16cqh, 2rem); font-weight: 700; }
    .gauge-value .unidad { font-size: clamp(0.7rem, 2.5vw, 1rem); font-weight: 500; }
    .scada-footer { text-align: center; font-size: 12px; background: var(--pt-tarjeta-2); padding: 5px 8px; border-radius: 6px; flex: none; }
    .temp-label { color: var(--pt-subtitulo); margin-right: 5px; }
    .temp-value { font-weight: bold; color: var(--app-navbar-color, #346BA6); }
    @keyframes pulso-aguja { 0% { opacity: 0.8; } 100% { opacity: 1; filter: brightness(1.3); } }
    @keyframes blink { from { opacity: 1; } to { opacity: 0.3; } }
    `],
})
export class GnlGaugeComponent {
    @Input({ required: true }) w!: WidgetComponente;

    private readonly gnl = inject(GnlVivoService);
    readonly peligro = GAUGE_GNL.colorPeligro;
    readonly normal = GAUGE_GNL.colorNormal;

    /** Sin pulso (o al cambiar de brazo) todo vuelve a cero, como limpiarTacometro de la web. */
    readonly presion = computed(() => this.gnl.lectura()?.presion ?? 0);
    readonly temperatura = computed(() => this.gnl.lectura()?.temperatura ?? 0);
    readonly brazo = computed(() => this.gnl.lectura()?.brazo ?? this.gnl.brazo());
    readonly color = computed(() => colorGaugeGnl(this.presion(), this.gnl.lectura()?.alarma ?? false));
    readonly geometria = computed(() => geometriaGaugeGnl(this.presion()));
}
