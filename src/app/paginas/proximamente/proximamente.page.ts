/*
    Author: German Valencia
    Secciones que llegan en la fase 3 (Alertas del Analista IA y Asistente).
    Ya ocupan su lugar en la navegación para no cambiarla después.
*/
import { Component, Input } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { IconoComponent } from '../../compartido/icono/icono.component';

@Component({
    selector: 'pm-proximamente',
    standalone: true,
    imports: [TranslateModule, IconoComponent],
    templateUrl: './proximamente.page.html',
    styleUrl: './proximamente.page.scss'
})
export class ProximamentePage {
    /** Viene de data.seccion en la ruta (withComponentInputBinding). */
    @Input() seccion: 'ALERTAS' | 'ASISTENTE' = 'ALERTAS';
}
