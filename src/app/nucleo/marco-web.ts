/*
    Author: German Valencia
    Marco de la web en la tableta (OT-014 fase 2, CC-110; regla 17: la tableta = la web). Lógica pura, sin Angular ni DOM.
    La página Tablero de la tableta carga `<web>/embebido` en un marco y conversa con él por postMessage. Es el mismo contrato
    de la web (PlataformaIA/src/app/plataforma/embebido/nucleo/embebido.ts):
      web → app  { fuente: 'porttos-web', v: 1, tipo: 'listo' | 'estado' | 'cerrar-sesion' | 'error', ... }
      app → web  { fuente: 'porttos-app', v: 1, tipo: 'sesion', token, codigoSesion, codigoAplicacion, codigoSuite, puerto?, pestana? }
    La sesión es la misma de la app (sesión única): nunca va en la URL. Solo se le habla al origen de la web configurada.
*/

export const FUENTE_APP = 'porttos-app';
export const FUENTE_WEB = 'porttos-web';
export const VERSION_MARCO = 1;
export const RUTA_MARCO = '/embebido';
/** Sin ningún aviso de la web en este tiempo, la tableta vuelve a la vista nativa (respaldo). */
export const ESPERA_MARCO_MS = 25000;

export type MotivoCierreMarco = 'usuario' | 'expirada' | 'reemplazada';

export type MensajeWeb =
    | { tipo: 'listo' }
    | { tipo: 'estado'; puerto: string | null; pestana: string | null }
    | { tipo: 'cerrar-sesion'; motivo: string }
    | { tipo: 'error'; mensaje: string };

export interface EstadoMarco {
    puerto: string | null;
    pestana: string | null;
}

/** Origen (protocolo + host + puerto) de una URL http(s); '' si no es válida. */
export function origenDeUrl(url: unknown): string {
    try {
        const u = new URL(String(url ?? '').trim());
        return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : '';
    } catch {
        return '';
    }
}

/** URL del marco: `<origen de la web>/embebido`; null si no hay web configurada. */
export function urlMarcoWeb(base: unknown): string | null {
    const o = origenDeUrl(base);
    return o ? o + RUTA_MARCO : null;
}

/** Solo la tableta con una web configurada usa el marco; el teléfono conserva su vista propia (KPI de a 2). */
export function usarMarcoWeb(esTableta: boolean, base: unknown): boolean {
    return esTableta && !!urlMarcoWeb(base);
}

const corto = (v: unknown, max: number): string | null => {
    const t = typeof v === 'string' ? v.trim() : '';
    return t && t.length <= max ? t : null;
};

/** Mensaje de la web, validado: viene del origen de la web y con el sobre del contrato. Lo demás → null. */
export function leerMensajeWeb(data: unknown, origen: unknown, origenWeb: string): MensajeWeb | null {
    if (!origenWeb || origen !== origenWeb || !data || typeof data !== 'object') return null;
    const m = data as Record<string, unknown>;
    if (m['fuente'] !== FUENTE_WEB || Number(m['v']) !== VERSION_MARCO) return null;
    switch (m['tipo']) {
        case 'listo': return { tipo: 'listo' };
        case 'estado': return { tipo: 'estado', puerto: corto(m['puerto'], 80), pestana: corto(m['pestana'], 80) };
        case 'cerrar-sesion': return { tipo: 'cerrar-sesion', motivo: corto(m['motivo'], 40) || 'usuario' };
        case 'error': return { tipo: 'error', mensaje: corto(m['mensaje'], 300) || '' };
        default: return null;
    }
}

/** Mensaje 'sesion' para la web: la sesión de la app, la aplicación y la suite del tablero, y el último puerto y pestaña. */
export function mensajeSesionParaWeb(
    sesion: { token: string; codigoSesion: string },
    destino: { codigoAplicacion: string; codigoSuite: string },
    ultimo: EstadoMarco | null
): Record<string, unknown> {
    return {
        fuente: FUENTE_APP, v: VERSION_MARCO, tipo: 'sesion',
        token: sesion.token, codigoSesion: sesion.codigoSesion,
        codigoAplicacion: destino.codigoAplicacion, codigoSuite: destino.codigoSuite,
        ...(ultimo?.puerto ? { puerto: ultimo.puerto } : {}),
        ...(ultimo?.pestana ? { pestana: ultimo.pestana } : {}),
    };
}

/** El cierre que pide la web, en los motivos del cierre de la app. 'sin-acceso' no cierra la sesión: la tableta vuelve a la vista nativa. */
export function motivoCierreDeWeb(motivo: string): MotivoCierreMarco | null {
    return motivo === 'usuario' || motivo === 'expirada' || motivo === 'reemplazada' ? motivo : null;
}
