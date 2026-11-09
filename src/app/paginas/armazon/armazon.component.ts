/*
    Author: German Valencia
    Armazón de las páginas internas.
    Tableta: igual a la web (encabezado con «Seleccione Puerto», reloj y fecha + barra de pestañas) y ☰ junto al logo.
    Teléfono: encabezado de una fila (☰, logo, puerto activo —solo informa; tocarlo abre el menú—, bandera, avatar);
    el filtro de puerto y las pestañas están en el menú lateral, y la barra inferior de 4 ítems.
    Tableta con la web en el marco (OT-014, CC-110): sin encabezado ni pestañas propios (son los de la web) y un ☰ flotante abajo a la izquierda. El menú se abre con ☰ o deslizando desde el borde izquierdo y se cierra
    tocando fuera, deslizando, con Escape o con «atrás» de Android.
*/
import { Component, OnDestroy, OnInit, computed, effect, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { estiloPestana, fechaEncabezado, horaEncabezado, textoSobre } from '@nucleo';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { SesionService } from '../../core/sesion.service';
import { PuertoService } from '../../core/puerto.service';
import { PestanasService } from '../../core/pestanas.service';
import { IdiomaService } from '../../core/idioma.service';
import { DispositivoService } from '../../core/dispositivo.service';
import { TemaService } from '../../core/tema.service';
import { AnalistaService } from '../../core/analista.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { MarcoWebService } from '../../core/marco-web.service';
import { NativoService } from '../../core/nativo.service';
import { MenuLateralComponent } from '../../compartido/menu-lateral/menu-lateral.component';
import { SelectorComponent } from '../../compartido/selector/selector.component';

@Component({
    selector: 'pm-armazon',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslateModule, IconoComponent, MenuLateralComponent, SelectorComponent],
    templateUrl: './armazon.component.html',
    styleUrl: './armazon.component.scss'
})
export class ArmazonComponent implements OnInit, OnDestroy {
    readonly ahora = signal(new Date());
    readonly hora = computed(() => horaEncabezado(this.ahora()));
    readonly fecha = computed(() => fechaEncabezado(this.ahora(), this.idioma.actual()));
    readonly pestanas = computed(() =>
        this.pestanasSrv.visibles().map((p) => ({ ...p, estilo: estiloPestana(p.codigoPestana, p) }))
    );
    /** Logo según el contraste de la barra (negativo sobre fondo oscuro, positivo sobre claro). */
    readonly logo = computed(() =>
        textoSobre(this.tema.colorBarra()) === '#111111'
            ? 'assets/images/porttos/porttos-principal-positivo.png'
            : 'assets/images/porttos/porttos-principal-negativo.png'
    );

    /** Menú lateral (puerto y pestañas). */
    readonly menu = signal(false);

    private reloj: ReturnType<typeof setInterval> | null = null;
    private bordeX: number | null = null;

    constructor(
        readonly sesion: SesionService,
        readonly puertos: PuertoService,
        readonly pestanasSrv: PestanasService,
        readonly idioma: IdiomaService,
        readonly dispositivo: DispositivoService,
        readonly tema: TemaService,
        readonly analista: AnalistaService,
        readonly notificaciones: NotificacionesService,
        readonly marco: MarcoWebService,
        private router: Router,
        nativo: NativoService
    ) {
        // El Analista IA sigue al puerto elegido aunque no se esté en Alertas (insignia y avisos al instante)
        effect(() => this.analista.seguir(this.puertos.seleccionado()), { allowSignalWrites: true });
        // «Atrás» de Android: primero cierra el menú o la hoja; si no hay nada abierto, la navegación normal
        nativo.alBotonAtras(() => {
            if (this.menu()) { this.menu.set(false); return true; }
            return false;
        });
    }

    /** Deslizar desde el borde izquierdo abre el menú. */
    tocarBorde(ev: TouchEvent): void {
        const x = ev.touches[0]?.clientX ?? 999;
        this.bordeX = !this.menu() && x <= 16 ? x : null;
    }

    soltarBorde(ev: TouchEvent): void {
        const fin = ev.changedTouches[0]?.clientX;
        if (this.bordeX !== null && fin !== undefined && fin - this.bordeX > 60) this.menu.set(true);
        this.bordeX = null;
    }

    ngOnInit(): void {
        this.reloj = setInterval(() => this.ahora.set(new Date()), 1000);
        void this.puertos.cargar();
        void this.pestanasSrv.cargar();
    }

    ngOnDestroy(): void {
        if (this.reloj) clearInterval(this.reloj);
    }

    cambiarPuerto(clave: string): void {
        void this.puertos.seleccionar(clave);
    }

    abrirPestana(codigo: string): void {
        void this.pestanasSrv.activar(codigo);
        void this.router.navigateByUrl('/app/tablero');
    }
}
