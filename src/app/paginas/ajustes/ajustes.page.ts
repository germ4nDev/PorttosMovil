/*
    Author: German Valencia
    Ajustes: tema (claro / oscuro / sistema), color de la barra superior, idioma, sesión y datos del equipo.
*/
import { Component, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { COLORES_BARRA, ModoTema } from '@nucleo';
import { IconoComponent } from '../../compartido/icono/icono.component';
import { TemaService } from '../../core/tema.service';
import { Idioma, IdiomaService } from '../../core/idioma.service';
import { SesionService } from '../../core/sesion.service';
import { DispositivoService } from '../../core/dispositivo.service';
import { NativoService } from '../../core/nativo.service';
import { NotificacionesService } from '../../core/notificaciones.service';
import { PuertoService } from '../../core/puerto.service';
import { BiometriaService } from '../../core/biometria.service';
import { environment } from '../../../environments/environment';

@Component({
    selector: 'pm-ajustes',
    standalone: true,
    imports: [TranslateModule, IconoComponent],
    templateUrl: './ajustes.page.html',
    styleUrl: './ajustes.page.scss'
})
export class AjustesPage {
    readonly colores = COLORES_BARRA;
    readonly modos: { valor: ModoTema; llave: string; icono: string }[] = [
        { valor: 'claro', llave: 'MOVIL.AJUSTES.CLARO', icono: 'sol' },
        { valor: 'oscuro', llave: 'MOVIL.AJUSTES.OSCURO', icono: 'luna' },
        { valor: 'sistema', llave: 'MOVIL.AJUSTES.SISTEMA', icono: 'movil' }
    ];
    readonly idiomas: { valor: Idioma; llave: string; bandera: string }[] = [
        { valor: 'es', llave: 'MOVIL.AJUSTES.ESPANOL', bandera: 'assets/flags/colombia.png' },
        { valor: 'en', llave: 'MOVIL.AJUSTES.INGLES', bandera: 'assets/flags/united-states.png' }
    ];
    readonly version = environment.appVersion;
    readonly servidor = (() => {
        try { return new URL(environment.apiUrl).host; } catch { return environment.apiUrl; }
    })();

    constructor(
        readonly tema: TemaService,
        readonly idioma: IdiomaService,
        readonly sesion: SesionService,
        readonly dispositivo: DispositivoService,
        readonly nativo: NativoService,
        readonly notificaciones: NotificacionesService,
        readonly puertos: PuertoService,
        readonly biometria: BiometriaService
    ) {
        void this.biometria.iniciar();
    }

    readonly infoBiometria = signal(false);

    cambiarBiometria(ev: Event): void {
        const activar = (ev.target as HTMLInputElement).checked;
        if (activar) {
            // Se activa en el próximo ingreso con usuario y clave (hacen falta para guardarlas cifradas)
            (ev.target as HTMLInputElement).checked = false;
            this.infoBiometria.set(true);
            void this.biometria.reofrecer();
            return;
        }
        void this.biometria.desactivar();
    }

    readonly resultadoPrueba = signal('');

    async probar(): Promise<void> {
        this.resultadoPrueba.set('MOVIL.NOTIFICACIONES.ENVIANDO');
        const r = await this.notificaciones.probar();
        this.resultadoPrueba.set(r === 'ok' ? 'MOVIL.NOTIFICACIONES.PRUEBA_OK' : r);
    }

    activar(ev: Event): void {
        void this.notificaciones.cambiar({ activas: (ev.target as HTMLInputElement).checked });
    }

    colorPersonalizado(ev: Event): void {
        void this.tema.cambiarColorBarra((ev.target as HTMLInputElement).value);
    }
}
