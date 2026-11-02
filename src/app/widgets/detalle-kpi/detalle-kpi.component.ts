/*
    Author: German Valencia
    Detalle de un KPI (hoja que sube desde abajo): valor, estado, gráfica de 24 h grande y mínimo / máximo.
    Se cierra con el botón, tocando fuera o con Escape.
*/
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { COLOR_ESTADO, KpiMovil, formatoValor, trazoArea, trazoLinea, variacionSerie } from '@nucleo';

@Component({
  selector: 'pm-detalle-kpi',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './detalle-kpi.component.html',
  styleUrl: './detalle-kpi.component.scss'
})
export class DetalleKpiComponent {
  @Input() idioma = 'es';
  @Output() readonly cerrar = new EventEmitter<void>();

  k!: KpiMovil;
  color = COLOR_ESTADO.neutro;
  linea = '';
  area = '';
  min: number | null = null;
  max: number | null = null;
  variacion: number | null = null;

  @Input({ required: true }) set kpi(v: KpiMovil) {
    this.k = v;
    this.color = COLOR_ESTADO[v.estado] || COLOR_ESTADO.neutro;
    const s = v.serie || [];
    this.linea = trazoLinea(s, 320, 120, 4);
    this.area = trazoArea(s, 320, 120, 4);
    this.min = s.length ? Math.min(...s) : null;
    this.max = s.length ? Math.max(...s) : null;
    this.variacion = variacionSerie(s);
  }

  f(v: number | string | null): string {
    return formatoValor(v, this.idioma);
  }

  @HostListener('document:keydown.escape')
  alEscape(): void {
    this.cerrar.emit();
  }

}
