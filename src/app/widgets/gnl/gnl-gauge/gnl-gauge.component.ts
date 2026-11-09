/*
    Author: German Valencia
    Tacómetro de presión GNL (PTT_GNL_GAUGE_PRESION), igual a gnl-gauge-widget de la web (OT-005): mismo SVG (arco de 110 px
    sobre viewBox 100×50), aguja de −90° a +90° para 0–100 psi, semáforo (rojo con alarma o ≥ 75 psi, naranja 72–75, azul
    criogénico), insignia del brazo y temperatura del ducto. Datos: GnlVivoService (socket, brazo elegido).
    La tarjeta móvil hace de marco (título, subtítulo e ícono de la web); el tamaño se adapta a la celda.
*/
import { ChangeDetectionStrategy, Component, Input, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { GAUGE_GNL, WidgetComponente, colorGaugeGnl, geometriaGaugeGnl } from '@nucleo';
import { GnlVivoService } from '../../../core/gnl-vivo.service';
import { IconoComponent } from '../../../compartido/icono/icono.component';

@Component({
    selector: 'pm-gnl-gauge',
    standalone: true,
    imports: [DecimalPipe, IconoComponent, TranslateModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './gnl-gauge.component.html',
    styleUrl: './gnl-gauge.component.scss',
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
