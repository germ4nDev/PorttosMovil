/*
    Author: German Valencia
    Almacenamiento del dispositivo.
      - leer / guardar / borrar: preferencias comunes con @capacitor/preferences (SharedPreferences / UserDefaults);
        en el navegador (ng serve) cae a localStorage.
      - leerSeguro / guardarSeguro / borrarSeguro (fase 4): datos sensibles —la sesión (token) y, si el usuario activa
        el ingreso con huella o Face ID, sus credenciales— en el Keychain de iOS o el Keystore de Android
        (@aparajita/capacitor-secure-storage). En el navegador el plugin usa localStorage: solo para desarrollo.
    Nunca lanza: si algo falla, devuelve null.
*/
import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

const PREFIJO = 'pm.';

@Injectable({ providedIn: 'root' })
export class AlmacenService {
    async leer(clave: string): Promise<string | null> {
        try {
            const { value } = await Preferences.get({ key: PREFIJO + clave });
            return value ?? null;
        } catch {
            try { return localStorage.getItem(PREFIJO + clave); } catch { return null; }
        }
    }

    async guardar(clave: string, valor: string): Promise<void> {
        try {
            await Preferences.set({ key: PREFIJO + clave, value: valor });
        } catch {
            try { localStorage.setItem(PREFIJO + clave, valor); } catch { /* sin almacenamiento */ }
        }
    }

    async borrar(clave: string): Promise<void> {
        try {
            await Preferences.remove({ key: PREFIJO + clave });
        } catch {
            try { localStorage.removeItem(PREFIJO + clave); } catch { /* sin almacenamiento */ }
        }
    }

    async leerJSON<T>(clave: string): Promise<T | null> {
        const v = await this.leer(clave);
        if (!v) return null;
        try { return JSON.parse(v) as T; } catch { return null; }
    }

    guardarJSON(clave: string, valor: unknown): Promise<void> {
        return this.guardar(clave, JSON.stringify(valor));
    }

    // ── Almacenamiento seguro (Keychain / Keystore) ────────────────────────────────────────────────

    async leerSeguro<T>(clave: string): Promise<T | null> {
        try {
            const v = await SecureStorage.get(PREFIJO + clave, false);
            if (v === null || v === undefined) return null;
            return (typeof v === 'string' ? JSON.parse(v) : v) as T;
        } catch {
            return null;
        }
    }

    async guardarSeguro(clave: string, valor: unknown): Promise<boolean> {
        try {
            await SecureStorage.set(PREFIJO + clave, JSON.stringify(valor), false);
            return true;
        } catch {
            return false;
        }
    }

    async borrarSeguro(clave: string): Promise<void> {
        try { await SecureStorage.remove(PREFIJO + clave); } catch { /* no estaba */ }
    }
}
