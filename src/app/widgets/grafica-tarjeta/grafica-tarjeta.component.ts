/*
    Author: German Valencia
    Una gráfica por tarjeta (barras, línea o dona) en SVG propio: sin librerías de gráficas en el teléfono.
    La geometría sale de el núcleo (nucleo/) (barras, trazoLinea, porcionesDona); aquí solo se pinta.
*/
import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';
import { Barra, PALETA_SERIES, Porcion, WidgetGrafica, barras, formatoValor, porcionesDona, trazoLinea } from '@nucleo';

const ANCHO = 320;
const ALTO = 140;

@Component({
  selector: 'pm-grafica-tarjeta',
  standalone: true,
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './grafica-tarjeta.component.html',
  styleUrl: './grafica-tarjeta.component.scss'
})
export class GraficaTarjetaComponent {
  @Input({ required: true }) w!: WidgetGrafica;
  @Input() idioma = 'es';

  readonly paleta = PALETA_SERIES;
  readonly ancho = ANCHO;
  readonly alto = ALTO;
  barrasCalc: Barra[] = [];
  lineas: string[] = [];
  porciones: Porcion[] = [];
  total = '';

  pct(v: number): string {
    return v.toLocaleString(this.idioma === 'en' ? 'en-US' : 'es-CO', { maximumFractionDigits: 1 });
  }

  ngOnChanges(): void {
    const s = this.w?.series || [];
    if (this.w?.forma === 'dona') {
      const v = s[0]?.valores || [];
      this.porciones = porcionesDona(v, 60, 16);
      this.total = formatoValor(v.reduce<number>((a, b) => a + (b ?? 0), 0), this.idioma);
    } else if (this.w?.forma === 'linea') {
      this.lineas = s.map((x) => trazoLinea(x.valores, ANCHO, ALTO, 4)).filter(Boolean);
    } else {
      this.barrasCalc = barras(s, ANCHO, ALTO);
    }
  }

}
