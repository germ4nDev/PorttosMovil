/*
    Author: German Valencia
    Asistente de Porttos (fase 3): mismo endpoint y mismo marco de alcance que el chat de la web.
    Usa el puerto y la pestaña elegidos; muestra fuentes, aviso de cifras sin respaldo, sugerencias y voto.
    Las respuestas se pintan con el núcleo (nucleo/).markdownSeguro (escapa todo el HTML).
*/
import { AfterViewChecked, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { etiquetaHerramienta, markdownSeguro } from '@nucleo';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { AsistenteService, Turno } from '../../core/asistente.service';
import { PuertoService } from '../../core/puerto.service';
import { PestanasService } from '../../core/pestanas.service';

const ESTADOS_CON_AVISO = ['RECHAZADA', 'SIN_DATOS', 'APAGADO', 'OMITIDA_APAGADA', 'TOPE_USUARIO', 'OMITIDA_PRESUPUESTO', 'CORTACIRCUITO', 'ERROR', 'INVALIDA'];

@Component({
    selector: 'pm-asistente',
    standalone: true,
    imports: [FormsModule, TranslateModule, IconoComponent],
    templateUrl: './asistente.page.html',
    styleUrl: './asistente.page.scss'
})
export class AsistentePage implements AfterViewChecked {
    readonly asistente = inject(AsistenteService);
    readonly puertos = inject(PuertoService);
    readonly pestanas = inject(PestanasService);
    private readonly traductor = inject(TranslateService);

    readonly texto = signal('');
    readonly ejemplos = ['MOVIL.PAGINAS.ASISTENTE.HOW_MANY_VESSELS_ARE_AT_ANCHOR', 'MOVIL.PAGINAS.ASISTENTE.WHICH_SHIPS_ARRIVE_IN_NEXT_24', 'MOVIL.PAGINAS.ASISTENTE.WHICH_INDICATORS_GOT_WORSE_WEEK'];
    readonly etiqueta = etiquetaHerramienta;

    @ViewChild('conversacion') private conversacion?: ElementRef<HTMLElement>;
    private ultimoLargo = 0;

    html(t: Turno): string {
        return markdownSeguro(t.respuesta?.respuesta || '');
    }

    aviso(t: Turno): string | null {
        const e = t.respuesta?.estado;
        return e && ESTADOS_CON_AVISO.includes(e) ? `MOVIL.ENUM.ASSISTANT_STATUS.${e}` : null;
    }

    fuera(t: Turno): boolean {
        return t.respuesta?.decision === 'fuera' || t.respuesta?.estado === 'RECHAZADA';
    }

    async enviar(pregunta?: string): Promise<void> {
        const q = (pregunta ?? this.texto()).trim();
        if (!q) return;
        this.texto.set('');
        await this.asistente.preguntar(q, this.puertos.seleccionado(), this.pestanas.activa());
    }

    enviarEjemplo(llave: string): void {
        void this.enviar(this.traductor.instant(llave));
    }

    ngAfterViewChecked(): void {
        const n = this.asistente.turnos().length + (this.asistente.ocupado() ? 0.5 : 0);
        if (n !== this.ultimoLargo && this.conversacion) {
            this.ultimoLargo = n;
            const el = this.conversacion.nativeElement;
            el.scrollTop = el.scrollHeight;
        }
    }
}
