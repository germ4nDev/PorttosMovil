/*
    Author: German Valencia
    Mapa logístico dentro de una pestaña (widget PTT_MAP_WGT_LOGISTICO del layout de la web): en el teléfono el mapa
    ocupa toda la pantalla, así que aquí es un acceso que abre la pestaña Mapa Logístico.
*/
import { ChangeDetectionStrategy, Component, Input, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WidgetMapa } from '@nucleo';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { PestanasService } from '../../core/pestanas.service';

const PESTANA_MAPA = 'TLC_MAPA_001';

@Component({
  selector: 'pm-mapa-acceso',
  standalone: true,
  imports: [TranslateModule, IconoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mapa-acceso.component.html',
  styleUrl: './mapa-acceso.component.scss'
})
export class MapaAccesoComponent {
  private readonly pestanas = inject(PestanasService);
  @Input({ required: true }) widget!: WidgetMapa;

  disponible(): boolean {
    return this.pestanas.visibles().some((p) => p.codigoPestana === PESTANA_MAPA);
  }

  abrir(): void {
    if (this.disponible()) void this.pestanas.activar(PESTANA_MAPA);
  }

}
