/*
    Author: German Valencia
    Analista IA de la pestaña (widgets PTT_IA_ANALISTA_* del layout de la web): las alertas tempranas vigentes del
    puerto que caen en el foco de esa pestaña (mismos tipos de hallazgo que el widget analista-ia de la web),
    las más graves primero. Tocar abre la página de Alertas, donde se califican.
*/
import { ChangeDetectionStrategy, Component, Input, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { WidgetAnalista, alertasDelFoco, colorSeveridad, horizonteTexto } from '@nucleo';
import { IconoComponent } from '../../compartido/icono.component';
import { AnalistaService } from '../../core/analista.service';

const MAX_ALERTAS = 3;

@Component({
  selector: 'pm-analista-tarjeta',
  standalone: true,
  imports: [TranslateModule, RouterLink, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `

    `,
  styles: [`
    
    `]
})
export class AnalistaTarjetaComponent {
  private readonly analista = inject(AnalistaService);
  private readonly w = signal<WidgetAnalista | null>(null);

  @Input({ required: true }) set widget(v: WidgetAnalista) { this.w.set(v); }

  readonly titulo = computed(() => this.w()?.titulo || 'Analista IA');
  readonly foco = computed(() => alertasDelFoco(this.analista.alertas(), this.w()?.tipos, MAX_ALERTAS));
  readonly hayCritica = computed(() => this.foco().items.some((a) => a.severidad === 'critica'));

  color(s?: string): string { return colorSeveridad(s); }
  horizonte(a: { horizonteMinH?: number | null; horizonteMaxH?: number | null }): string { return horizonteTexto(a.horizonteMinH ?? null, a.horizonteMaxH ?? null); }
}
