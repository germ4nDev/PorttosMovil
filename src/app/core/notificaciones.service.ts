/*
    Author: German Valencia
    Notificaciones push de Porttos móvil (fase 3).
      - Preferencias guardadas en el equipo: activas, severidad mínima (critica | atencion) y puertos (el elegido o TODOS).
      - sincronizar(): después de iniciar sesión vuelve a registrar el token con la sesión nueva. Como un usuario tiene
        una sola sesión sin importar el dispositivo, el servidor solo avisa al equipo de la sesión activa.
      - baja(): al cerrar sesión (mientras la sesión sigue válida) o al apagar las notificaciones.
      - Tocar una notificación lleva a Alertas con su puerto; si llega con la app abierta se muestra un aviso arriba.
*/
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';
import { NativoService, NotificacionRecibida } from './nativo.service';
import { PuertoService } from './puerto.service';
import { IdiomaService } from './idioma.service';

export interface PreferenciasPush {
    activas: boolean;
    severidadMinima: 'critica' | 'atencion';
    alcance: 'puerto' | 'TODOS';
}

const DEFECTO: PreferenciasPush = { activas: false, severidadMinima: 'critica', alcance: 'TODOS' };

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
    readonly preferencias = signal<PreferenciasPush>(DEFECTO);
    readonly estado = signal<'inactivo' | 'trabajando' | 'listo' | 'error'>('inactivo');
    /** Clave de traducción del último problema (permiso negado, servidor sin configurar...). */
    readonly problema = signal('');
    /** Aviso dentro de la app cuando llega una notificación con la app abierta. */
    readonly aviso = signal<NotificacionRecibida | null>(null);

    private token: string | null = null;
    private iniciado = false;

    constructor(
        private http: HttpClient,
        private router: Router,
        private almacen: AlmacenService,
        private nativo: NativoService,
        private puertos: PuertoService,
        private idioma: IdiomaService
    ) {}

    get disponible(): boolean {
        return this.nativo.esNativo;
    }

    async iniciar(): Promise<void> {
        if (this.iniciado) return;
        this.iniciado = true;
        const p = await this.almacen.leerJSON<PreferenciasPush>('push');
        if (p) this.preferencias.set({ ...DEFECTO, ...p });
        this.token = await this.almacen.leer('pushToken');
        this.nativo.alAbrirNotificacion((d) => void this.abrir(d));
        this.nativo.alRecibirNotificacion((n) => {
            this.aviso.set(n);
            setTimeout(() => { if (this.aviso() === n) this.aviso.set(null); }, 8000);
        });
    }

    async abrir(datos: Record<string, string>): Promise<void> {
        this.aviso.set(null);
        if (datos['puerto']) await this.puertos.seleccionar(String(datos['puerto']).toUpperCase());
        await this.router.navigateByUrl(datos['ruta'] && datos['ruta'].startsWith('/app/') ? datos['ruta'] : '/app/alertas');
    }

    /** Tras iniciar sesión: si estaban activas, registra el token con la sesión nueva. */
    async sincronizar(): Promise<void> {
        await this.iniciar();
        if (this.preferencias().activas && this.disponible) await this.registrar();
    }

    async cambiar(p: Partial<PreferenciasPush>): Promise<void> {
        this.preferencias.set({ ...this.preferencias(), ...p });
        await this.almacen.guardarJSON('push', this.preferencias());
        if (!this.disponible) return;
        if (this.preferencias().activas) await this.registrar();
        else await this.baja();
    }

    private async registrar(): Promise<void> {
        this.estado.set('trabajando');
        this.problema.set('');
        const r = await this.nativo.registrarPush();
        if (!r.token) {
            this.estado.set('error');
            this.problema.set(r.motivo === 'denegado' ? 'MOVIL.CORE.NOTIFICATION_PERMISSION_DENIED_TURN_IT_ON' : 'MOVIL.CORE.PHONE_DID_NOT_PROVIDE_NOTIFICATION_IDENTIFIER');
            if (r.motivo === 'denegado') {
                this.preferencias.set({ ...this.preferencias(), activas: false });
                await this.almacen.guardarJSON('push', this.preferencias());
            }
            return;
        }
        this.token = r.token;
        await this.almacen.guardar('pushToken', r.token);
        const pref = this.preferencias();
        const puerto = this.puertos.seleccionado();
        try {
            const resp = await firstValueFrom(this.http.post<{ ok: boolean; data: { notificacionesActivas: boolean } }>(`${environment.apiUrl}/movil/dispositivos`, {
                token: r.token,
                plataforma: this.nativo.plataforma === 'ios' ? 'ios' : 'android',
                puertos: pref.alcance === 'puerto' && puerto !== 'TODOS' ? [puerto] : 'TODOS',
                severidadMinima: pref.severidadMinima,
                idioma: this.idioma.actual()
            }));
            this.estado.set('listo');
            if (!resp.data?.notificacionesActivas) this.problema.set('MOVIL.CORE.DEVICE_WAS_REGISTERED_BUT_SERVER_NOT');
        } catch {
            this.estado.set('error');
            this.problema.set('MOVIL.CORE.DEVICE_COULD_NOT_BE_REGISTERED_ON');
        }
    }

    /** Deja de recibir en este equipo. Se llama con la sesión todavía válida (antes de cerrarla). */
    async baja(): Promise<void> {
        if (!this.token) return;
        try {
            await firstValueFrom(this.http.post(`${environment.apiUrl}/movil/dispositivos/baja`, { token: this.token }));
        } catch {
            /* si la sesión ya no es válida, el servidor igual deja de avisar a este equipo */
        }
        this.estado.set('inactivo');
    }

    async probar(): Promise<'ok' | string> {
        try {
            await firstValueFrom(this.http.post(`${environment.apiUrl}/movil/dispositivos/prueba`, {}));
            return 'ok';
        } catch (e) {
            return (e as { error?: { msg?: string } })?.error?.msg || 'error';
        }
    }
}
