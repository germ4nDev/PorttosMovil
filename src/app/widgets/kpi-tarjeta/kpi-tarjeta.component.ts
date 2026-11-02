/*
    Author: German Valencia
    Tarjeta KPI móvil: borde izquierdo de color por estado (como kpi-card-tcl de la web), valor grande,
    unidad, mini-gráfica de 24 h y variación. Tocarla abre el detalle.
*/
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { COLOR_ESTADO, KpiMovil, formatoValor, trazoArea, trazoLinea, variacionSerie } from '@nucleo';

@Component({
  selector: 'pm-kpi-tarjeta',
  standalone: true,
  imports: [TranslateModule],
  templateUrl: './kpi-tarjeta.component.html',
  styleUrl: './kpi-tarjeta.component.scss'
})
export class KpiTarjetaComponent {
  private readonly dato = signal<KpiMovil | null>(null);
  private readonly lang = signal('es');

  @Input({ required: true }) set kpi(v: KpiMovil) { this.dato.set(v); }
  @Input() set idioma(v: string) { this.lang.set(v || 'es'); }
  @Output() readonly abrir = new EventEmitter<KpiMovil>();

  readonly k = computed(() => this.dato()!);
  readonly color = computed(() => COLOR_ESTADO[this.k().estado] || COLOR_ESTADO.neutro);
  readonly valor = computed(() => formatoValor(this.k().valor, this.lang()));
  readonly linea = computed(() => trazoLinea(this.k().serie || [], 120, 32));
  readonly area = computed(() => trazoArea(this.k().serie || [], 120, 32));
  readonly variacion = computed(() => variacionSerie(this.k().serie));
  readonly abs = Math.abs;

}
