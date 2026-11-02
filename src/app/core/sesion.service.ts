/*
    Author: German Valencia
    Sesión de Porttos móvil: POST /api/auth (el mismo login de la web), que crea la fila en PTLSesiones
    y devuelve token + codigoSesion. Todas las peticiones viajan con x-token y x-sesion-id (validarJWT + validarSesion).
    "Recordarme" guarda la sesión cifrada en el Keychain / Keystore del teléfono; sin él, vive solo en memoria.
    Una sola sesión por usuario sin importar el dispositivo: si se inicia en otro equipo (web o móvil), el API desactiva
    esta y avisa por socket ('sesion-reemplazada'); la app se cierra al instante con el aviso correspondiente.
*/
import { Injectable, computed, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { SesionPorttos, extraerSesion, iniciales, tokenExpirado } from '@nucleo';
import { environment } from '../../environments/environment';
import { AlmacenService } from './almacen.service';
import { SocketService } from './socket.service';
import { NotificacionesService } from './notificaciones.service';
import { AnalistaService } from './analista.service';
import { AsistenteService } from './asistente.service';

export type MotivoCierre = 'usuario' | 'expirada' | 'reemplazada';

@Injectable({ providedIn: 'root' })
export class SesionService {
    readonly sesion = signal<SesionPorttos | null>(null);
    readonly iniciales = computed(() => iniciales(this.sesion()?.nombreUsuario || ''));
    /** Mensaje para mostrar en el login después de un cierre automático. */
    readonly avisoCierre = signal<string>('');

    private restaurada: Promise<void> | null = null;
    private vigilancia: Subscription | null = null;

    constructor(
        private http: HttpClient,
        private router: Router,
        private almacen: AlmacenService,
        private socket: SocketService,
        private notificaciones: NotificacionesService,
        private analista: AnalistaService,
        private asistente: AsistenteService
    ) {}

    /** Recupera la sesión guardada (una sola vez). El guard espera esta promesa. */
    restaurar(): Promise<void> {
        if (!this.restaurada) {
            this.restaurada = (async () => {
                const guardada = extraerSesion(await this.leerGuardada());
                if (guardada && !tokenExpirado(guardada.token)) {
                    this.sesion.set(guardada);
                    this.conectar(guardada);
                    void this.notificaciones.iniciar();
                } else if (guardada) {
                    await this.olvidar();
                }
            })();
        }
        return this.restaurada;
    }

    get token(): string {
        return this.sesion()?.token || '';
    }

    /** Socket + vigilancia de la sesión única. */
    private conectar(s: SesionPorttos): void {
        this.socket.conectar(s);
        this.vigilancia?.unsubscribe();
        this.vigilancia = this.socket.escuchar<{ codigoUsuario?: string; nuevaSesionId?: string }>('sesion-reemplazada').subscribe((d) => {
            const actual = this.sesion();
            if (actual && d?.codigoUsuario === actual.codigoUsuario && d?.nuevaSesionId && d.nuevaSesionId !== actual.codigoSesion) {
                void this.cerrar('reemplazada');
            }
        });
    }

    async iniciar(usuario: string, clave: string, recordar: boolean): Promise<void> {
        try {
            const resp = await firstValueFrom(this.http.post<any>(`${environment.apiUrl}/auth`, { username: usuario, password: clave }));
            const s = extraerSesion(resp);
            if (!s) throw new Error('Respuesta de inicio de sesión no válida.');
            this.sesion.set(s);
            this.avisoCierre.set('');
            if (recordar) await this.almacen.guardarSeguro('sesion', { token: s.token, codigoSesion: s.codigoSesion, usuario: resp.usuario });
            else await this.olvidar();
            await this.almacen.guardar('ultimoUsuario', recordar ? usuario : '');
            this.conectar(s);
            // La sesión es nueva: el teléfono vuelve a registrarse para recibir las notificaciones de esta sesión
            void this.notificaciones.sincronizar();
        } catch (e) {
            const err = e as HttpErrorResponse;
            if (err?.status === 0) throw new Error('No hay conexión con el servidor de Porttos.');
            throw new Error(err?.error?.msg || (e as Error)?.message || 'Error en la autenticación');
        }
    }

    async cerrar(motivo: MotivoCierre = 'usuario'): Promise<void> {
        if (!this.sesion() && motivo !== 'usuario') return; // evita cierres repetidos por varios 401
        // Con la sesión todavía válida, este equipo deja de recibir notificaciones
        if (motivo === 'usuario') await this.notificaciones.baja();
        this.sesion.set(null);
        this.vigilancia?.unsubscribe();
        this.vigilancia = null;
        this.analista.detener();
        this.asistente.nueva();
        this.socket.desconectar();
        await this.olvidar();
        this.avisoCierre.set(
            motivo === 'expirada' ? 'Tu sesión ha expirado por inactividad o seguridad. Por favor ingresa nuevamente.'
            : motivo === 'reemplazada' ? 'Tu sesión se cerró porque se inició otra con tu usuario en otro dispositivo.'
            : ''
        );
        await this.router.navigateByUrl('/login', { replaceUrl: true });
    }

    /** La sesión guardada vive en el Keychain / Keystore (fase 4). Si quedó una de antes en Preferences, se migra. */
    private async leerGuardada(): Promise<unknown> {
        const segura = await this.almacen.leerSeguro<unknown>('sesion');
        if (segura) return segura;
        const anterior = await this.almacen.leerJSON<unknown>('sesion');
        if (anterior) {
            await this.almacen.guardarSeguro('sesion', anterior);
            await this.almacen.borrar('sesion');
        }
        return anterior;
    }

    private async olvidar(): Promise<void> {
        await this.almacen.borrarSeguro('sesion');
        await this.almacen.borrar('sesion');
    }

    ultimoUsuario(): Promise<string | null> {
        return this.almacen.leer('ultimoUsuario');
    }
}
