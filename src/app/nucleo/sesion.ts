/*
    Author: German Valencia
    el núcleo (nucleo/) · sesión
    Lógica pura (sin Angular, sin navegador) que comparten la web y la app móvil:
    leer el usuario guardado, armar las cabeceras x-token / x-sesion-id y saber si el token venció.
*/

/** Lo mínimo que la app necesita del usuario autenticado (respuesta de POST /api/auth). */
export interface SesionPorttos {
    token: string;
    codigoSesion: string;
    codigoUsuario: string;
    nombreUsuario: string;
    correo: string;
}

/** URLs que viajan sin token, igual que en el AuthInterceptor de la web. */
export const URLS_PUBLICAS: readonly string[] = [
    '/api/public/websites',
    '/api/public/data',
    '/assets/',
    '/api/auth/login'
];

export function esUrlPublica(url: string): boolean {
    const u = url || '';
    if (/^(\.\/)?assets\//.test(u)) return true;              // recursos relativos (traducciones de la app)
    if (/\/api\/auth\/?$/.test(u.split('?')[0])) return true; // POST /api/auth (login)
    return URLS_PUBLICAS.some((p) => u.includes(p));
}

/**
 * Acepta la respuesta del login ({ ok, token, usuario, codigoSesion }) o el currentUser
 * que guarda la web (codigoSesion dentro de usuario). Devuelve null si falta el token.
 */
export function extraerSesion(raw: any): SesionPorttos | null {
    if (!raw || typeof raw !== 'object') return null;
    const token = typeof raw.token === 'string' ? raw.token : '';
    if (!token) return null;
    const u = raw.usuario || {};
    return {
        token,
        codigoSesion: String(raw.codigoSesion || u.codigoSesion || ''),
        codigoUsuario: String(u.codigoUsuario || raw.codigoUsuario || ''),
        nombreUsuario: String(u.nombreUsuario || u.userNameUsuario || ''),
        correo: String(u.correoUsuario || '')
    };
}

/** Cabeceras que esperan validarJWT y validarSesion en el API. */
export function cabecerasSesion(s: SesionPorttos | null): Record<string, string> {
    if (!s || !s.token) return {};
    const h: Record<string, string> = { 'x-token': s.token };
    if (s.codigoSesion) h['x-sesion-id'] = s.codigoSesion;
    return h;
}

function base64UrlADatos(seg: string): string {
    const b64 = seg.replace(/-/g, '+').replace(/_/g, '/');
    const relleno = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    if (typeof atob === 'function') {
        const bin = atob(relleno);
        // UTF-8 seguro
        try {
            return decodeURIComponent(bin.split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
        } catch {
            return bin;
        }
    }
    const B: any = (globalThis as any).Buffer;
    return B ? B.from(relleno, 'base64').toString('utf8') : '';
}

/** Lee el payload de un JWT sin validarlo (la validación real la hace el API). */
export function leerPayloadJWT(token: string): any | null {
    const partes = (token || '').split('.');
    if (partes.length !== 3) return null;
    try {
        return JSON.parse(base64UrlADatos(partes[1]));
    } catch {
        return null;
    }
}

/** true si el token no se puede leer o su exp ya pasó (con un margen en segundos). */
export function tokenExpirado(token: string, ahoraMs: number = Date.now(), margenSeg = 30): boolean {
    const p = leerPayloadJWT(token);
    if (!p || typeof p.exp !== 'number') return true;
    return p.exp * 1000 <= ahoraMs + margenSeg * 1000;
}

/** Iniciales para el avatar del encabezado ("German Valencia" → "GV"). */
export function iniciales(nombre: string): string {
    const partes = (nombre || '').trim().split(/\s+/).filter(Boolean);
    if (!partes.length) return '?';
    const a = partes[0][0] || '';
    const b = partes.length > 1 ? partes[partes.length - 1][0] : partes[0][1] || '';
    return (a + b).toUpperCase();
}
