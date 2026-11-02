/*
    Author: German Valencia
    Alertas del Analista IA (fase 3): las mismas tres vistas del widget de la web —Alertas, Tendencias y Turno—
    para el puerto elegido. Las alertas se califican con «Útil» / «No era» (CONFIRMADO / FALSO) y se actualizan
    solas cuando el analista publica (socket 'ia-hallazgo').
*/
import { Component, effect, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { Hallazgo, colorSeveridad, esSimulada, horizonteTexto, yaCalificada } from '@nucleo';
import { IconoComponent } from '../../compartido/icono.component';
import { AnalistaService } from '../../core/analista.service';
import { PuertoService } from '../../core/puerto.service';
import { DispositivoService } from '../../core/dispositivo.service';

type Vista = 'alertas' | 'tendencias' | 'turno';

@Component({
    selector: 'pm-alertas',
    standalone: true,
    imports: [TranslateModule, IconoComponent],
    templateUrl: './alertas.page.html',
    styleUrl: './alertas.page.scss'
})
export class AlertasPage {
    readonly analista = inject(AnalistaService);
    readonly puertos = inject(PuertoService);
    readonly dispositivo = inject(DispositivoService);

    readonly vista = signal<Vista>('alertas');
    readonly abierta = signal<number | null>(null);
    readonly votando = signal<number | null>(null);
    readonly vistas: { id: Vista; llave: string }[] = [
        { id: 'alertas', llave: 'MOVIL.ALERTAS.VISTA_ALERTAS' },
        { id: 'tendencias', llave: 'MOVIL.ALERTAS.VISTA_TENDENCIAS' },
        { id: 'turno', llave: 'MOVIL.ALERTAS.VISTA_TURNO' }
    ];

    readonly color = colorSeveridad;
    readonly horizonte = horizonteTexto;
    readonly calificada = yaCalificada;
    readonly simulada = esSimulada;

    constructor() {
        effect(() => this.analista.seguir(this.puertos.seleccionado()), { allowSignalWrites: true });
        effect(() => {
            const v = this.vista();
            const panel = this.analista.panel();
            if (!panel) return;
            if (v === 'tendencias' && this.analista.tendencias() === null) void this.analista.cargarTendencias();
            if (v === 'turno' && this.analista.resumenes() === null) void this.analista.cargarResumenes();
        }, { allowSignalWrites: true });
    }

    alternar(id: number): void {
        this.abierta.set(this.abierta() === id ? null : id);
    }

    async votar(h: Hallazgo, util: boolean): Promise<void> {
        this.votando.set(h.id);
        await this.analista.calificar(h, util);
        this.votando.set(null);
    }

    recargar(): void {
        void this.analista.cargarPanel();
        if (this.vista() === 'tendencias') void this.analista.cargarTendencias();
        if (this.vista() === 'turno') void this.analista.cargarResumenes();
    }

    elegirPuerto(clave: string): void {
        void this.puertos.seleccionar(clave);
    }

    hora(iso?: string): string {
        if (!iso) return '';
        const d = new Date(iso);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }

    /** La confianza del analista va de 0 a 1. */
    pct(c: number): number {
        return Math.round((c <= 1 ? c * 100 : c));
    }

    efectoColor(e?: string): string {
        return e === 'empeora' ? '#FF5370' : e === 'mejora' ? '#2ED8B6' : '#9C9C9C';
    }
}
