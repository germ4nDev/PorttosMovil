/*
    Author: German Valencia
    Menú lateral (☰ junto al logo): puerto (lista desplegable, para que con muchos puertos las pestañas no queden
    abajo), las pestañas de la Torre de Control con su ícono y color (como la web),
    y abajo Alertas, Asistente, Ajustes, tema y cerrar sesión. Se cierra tocando fuera, deslizando hacia la izquierda,
    con Escape o con el botón «atrás» de Android (lo maneja el armazón).
*/
import { ChangeDetectionStrategy, Component, EventEmitter, HostListener, Input, Output, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { estiloPestana } from '@nucleo';
import { IconoComponent } from '../icono/icono.component';
import { SelectorComponent } from '../selector/selector.component';
import { PestanasService } from '../../core/pestanas.service';
import { PuertoService } from '../../core/puerto.service';
import { SesionService } from '../../core/sesion.service';
import { AnalistaService } from '../../core/analista.service';
import { TemaService } from '../../core/tema.service';
import { environment } from '../../../environments/environment';

const UMBRAL_DESLIZAR_PX = 60;

@Component({
    selector: 'pm-menu-lateral',
    standalone: true,
    imports: [TranslateModule, RouterLink, RouterLinkActive, IconoComponent, SelectorComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './menu-lateral.component.html',
    styleUrl: './menu-lateral.component.scss'
})
export class MenuLateralComponent {
    readonly pestanasSrv = inject(PestanasService);
    readonly puertos = inject(PuertoService);
    readonly sesion = inject(SesionService);
    readonly analista = inject(AnalistaService);
    readonly tema = inject(TemaService);
    private readonly router = inject(Router);

    @Input() abierto = false;
    @Input() hora = '';
    /** Tableta con la web en el marco (OT-014): sin puerto ni pestañas (se eligen en la web). */
    @Input() soloSecciones = false;
    @Output() readonly cerrar = new EventEmitter<void>();

    readonly version = environment.appVersion;
    readonly pestanas = computed(() => this.pestanasSrv.visibles().map((p) => ({ ...p, estilo: estiloPestana(p.codigoPestana, p) })));

    private inicioX: number | null = null;

    /** Cambia el puerto y deja el menú abierto (lo normal es elegir luego la pestaña). */
    cambiarPuerto(clave: string): void {
        void this.puertos.seleccionar(clave);
    }

    abrirPestana(codigo: string): void {
        void this.pestanasSrv.activar(codigo);
        void this.router.navigateByUrl('/app/tablero');
        this.cerrar.emit();
    }

    alternarTema(): void {
        void this.tema.cambiarModo(this.tema.efectivo() === 'oscuro' ? 'claro' : 'oscuro');
    }

    salir(): void {
        this.cerrar.emit();
        void this.sesion.cerrar('usuario');
    }

    tocar(ev: TouchEvent): void {
        this.inicioX = ev.touches[0]?.clientX ?? null;
    }

    soltar(ev: TouchEvent): void {
        const fin = ev.changedTouches[0]?.clientX;
        if (this.inicioX !== null && fin !== undefined && this.inicioX - fin > UMBRAL_DESLIZAR_PX) this.cerrar.emit();
        this.inicioX = null;
    }

    @HostListener('document:keydown.escape')
    alEscape(): void {
        if (this.abierto) this.cerrar.emit();
    }
}
