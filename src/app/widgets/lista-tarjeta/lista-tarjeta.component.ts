/*
    Author: German Valencia
    Lista móvil (en lugar de las tablas de la web): título y detalle a la izquierda, valor a la derecha,
    punto de estado y barra de avance cuando aplica. Los enlaces (noticias) abren fuera de la app.
*/
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { COLOR_ESTADO, ItemLista, WidgetLista, formatoValor } from '@nucleo';

@Component({
  selector: 'pm-lista-tarjeta',
  standalone: true,
  imports: [TranslateModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './lista-tarjeta.component.html',
  styleUrl: './lista-tarjeta.component.scss'
})
export class ListaTarjetaComponent {
  @Input({ required: true }) w!: WidgetLista;
  @Input() idioma = 'es';

  color(it: ItemLista): string {
    return COLOR_ESTADO[it.estado || 'neutro'];
  }

  valor(it: ItemLista): string {
    return formatoValor(it.valor ?? null, this.idioma);
  }

  limitar(p: number): number {
    return Math.max(0, Math.min(100, p));
  }

}
