/*
    Author: German Valencia
    Puente con el sistema operativo (Capacitor): orientación fija, barra de estado, pantalla de carga,
    regreso de la app al primer plano, notificaciones push (fase 3) y biometría (fase 4).
    En el navegador todo es no-op, para que ng serve funcione igual.
*/
import { Injectable, NgZone } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { PushNotifications } from '@capacitor/push-notifications';
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth';
import { Orientacion } from '@nucleo';

export interface ResultadoPush { token: string | null; motivo?: 'web' | 'denegado' | 'tiempo' | string; }
export type TipoBiometria = 'huella' | 'rostro' | 'iris' | 'ninguna';
export interface NotificacionRecibida { titulo: string; cuerpo: string; datos: Record<string, string>; }

const ESPERA_TOKEN_MS = 15000;

@Injectable({ providedIn: 'root' })
export class NativoService {
    readonly esNativo = Capacitor.isNativePlatform();
    readonly plataforma = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

    constructor(private zona: NgZone) {}

    /** Teléfono en vertical, tableta en horizontal (ver el núcleo (nucleo/).orientacionObjetivo). */
    async bloquearOrientacion(o: Orientacion): Promise<void> {
        if (!this.esNativo) return;
        try {
            await ScreenOrientation.lock({ orientation: o });
        } catch (e) {
            console.warn('[nativo] No se pudo fijar la orientación', e);
        }
    }

    async colorBarraEstado(hex: string, textoClaro: boolean): Promise<void> {
        if (!this.esNativo) return;
        try {
            await StatusBar.setStyle({ style: textoClaro ? Style.Dark : Style.Light });
            if (this.plataforma === 'android') await StatusBar.setBackgroundColor({ color: hex });
        } catch {
            /* algunos equipos no permiten cambiarla */
        }
    }

    async ocultarCarga(): Promise<void> {
        if (!this.esNativo) return;
        try { await SplashScreen.hide(); } catch { /* ya oculta */ }
    }

    /** Avisa cuando la app vuelve al primer plano (para reconectar y refrescar). */
    alVolver(fn: () => void): void {
        if (!this.esNativo) {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') this.zona.run(fn);
            });
            return;
        }
        App.addListener('appStateChange', ({ isActive }) => {
            if (isActive) this.zona.run(fn);
        });
    }

    /** «Atrás» de Android: si fn devuelve true ya se atendió (p. ej. cerrar el menú); si no, atrás o salir. */
    alBotonAtras(fn: () => boolean): void {
        if (this.plataforma !== 'android') return;
        void App.addListener('backButton', ({ canGoBack }) => this.zona.run(() => {
            if (fn()) return;
            if (canGoBack) window.history.back();
            else void App.exitApp();
        }));
    }

    // ── Notificaciones push (FCM en Android; APNs vía Firebase en iOS) ─────────────────────────────

    /** Pide permiso, crea el canal de Android y devuelve el token del dispositivo (o el motivo por el que no hay). */
    async registrarPush(): Promise<ResultadoPush> {
        if (!this.esNativo) return { token: null, motivo: 'web' };
        try {
            let permiso = await PushNotifications.checkPermissions();
            if (permiso.receive === 'prompt' || permiso.receive === 'prompt-with-rationale') permiso = await PushNotifications.requestPermissions();
            if (permiso.receive !== 'granted') return { token: null, motivo: 'denegado' };
            if (this.plataforma === 'android') {
                await PushNotifications.createChannel({
                    id: 'alertas-ia', name: 'Alertas tempranas', description: 'Alertas del Analista IA de Porttos',
                    importance: 5, visibility: 1, lights: true, vibration: true
                }).catch(() => undefined);
            }
            return await new Promise<ResultadoPush>((resolver) => {
                let listo = false;
                const fin = (r: ResultadoPush) => { if (!listo) { listo = true; resolver(r); } };
                void PushNotifications.addListener('registration', (t) => fin({ token: t.value }));
                void PushNotifications.addListener('registrationError', (e) => fin({ token: null, motivo: e.error }));
                void PushNotifications.register();
                setTimeout(() => fin({ token: null, motivo: 'tiempo' }), ESPERA_TOKEN_MS);
            });
        } catch (e) {
            return { token: null, motivo: (e as Error)?.message || 'error' };
        }
    }

    /** El usuario tocó una notificación (con la app cerrada o en segundo plano). */
    alAbrirNotificacion(fn: (datos: Record<string, string>) => void): void {
        if (!this.esNativo) return;
        void PushNotifications.addListener('pushNotificationActionPerformed', (a) =>
            this.zona.run(() => fn((a.notification?.data || {}) as Record<string, string>)));
    }

    /** Llegó una notificación con la app abierta (el sistema no la muestra: la app decide). */
    alRecibirNotificacion(fn: (n: NotificacionRecibida) => void): void {
        if (!this.esNativo) return;
        void PushNotifications.addListener('pushNotificationReceived', (n) =>
            this.zona.run(() => fn({ titulo: n.title || '', cuerpo: n.body || '', datos: (n.data || {}) as Record<string, string> })));
    }

    // ── Biometría (huella, Face ID) — fase 4 ──────────────────────────────────────────────────────

    async biometria(): Promise<{ disponible: boolean; tipo: TipoBiometria }> {
        if (!this.esNativo) return { disponible: false, tipo: 'ninguna' };
        try {
            const r = await BiometricAuth.checkBiometry();
            const t = r.biometryType;
            const tipo: TipoBiometria = t === BiometryType.faceId || t === BiometryType.faceAuthentication ? 'rostro'
                : t === BiometryType.irisAuthentication ? 'iris'
                : t === BiometryType.none ? 'ninguna' : 'huella';
            return { disponible: !!r.isAvailable, tipo };
        } catch {
            return { disponible: false, tipo: 'ninguna' };
        }
    }

    /** true si el usuario se autenticó; false si canceló, falló o no hay biometría. */
    async autenticarBiometria(motivo: string): Promise<boolean> {
        if (!this.esNativo) return false;
        try {
            await BiometricAuth.authenticate({
                reason: motivo, cancelTitle: 'Cancelar', allowDeviceCredential: true,
                iosFallbackTitle: 'Usar código', androidTitle: 'Porttos', androidSubtitle: motivo, androidConfirmationRequired: false
            });
            return true;
        } catch {
            return false;
        }
    }
}
