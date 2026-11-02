/*
    Author: German Valencia
    Secciones que llegan en la fase 3 (Alertas del Analista IA y Asistente).
    Ya ocupan su lugar en la navegación para no cambiarla después.
*/
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconoComponent } from '../../compartido/icono.component';

@Component({
    selector: 'pm-proximamente',
    standalone: true,
    imports: [TranslateModule, IconoComponent],
    template: `
    <section class="pt-tarjeta caja">
      <span class="sello"><pm-icono [nombre]="seccion === 'ASISTENTE' ? 'chat' : 'campana'" [tam]="26"></pm-icono></span>
      <h1 class="pt-tarjeta__titulo">{{ 'MOVIL.PROXIMAMENTE.' + seccion | translate }}</h1>
      <p class="pt-tarjeta__sub">{{ 'MOVIL.PROXIMAMENTE.TEXTO' | translate }}</p>
    </section>
    `,
    styles: [`
    .caja { display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; padding: 32px 18px; border-left: 4px solid var(--pt-ia); }
    .sello { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
      background: color-mix(in srgb, var(--pt-ia) 16%, transparent); color: var(--pt-ia); }
    `]
})
export class ProximamentePage {
    /** Viene de data.seccion en la ruta (withComponentInputBinding). */
    @Input() seccion: 'ALERTAS' | 'ASISTENTE' = 'ALERTAS';
}
