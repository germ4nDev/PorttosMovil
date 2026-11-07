/*
    Author: German Valencia
    Marco de la web (OT-014 fase 2, CC-110; regla 17: la tableta = la web; OT-017: también el teléfono). Lógica pura, sin Angular ni DOM.
    La página Tablero carga `<web>/embebido` en un marco y conversa con él por postMessage. Es el mismo contrato
    de la web (PlataformaIA/src/app/plataforma/embebido/nucleo/embebido.ts):
      web → app  { fuente: 'porttos-web', v: 1, tipo: 'listo' | 'estado' | 'cerrar-sesion' | 'error', ... }
      app → web  { fuente: 'porttos-app', v: 2, tipo: 'sesion', token, codigoSesion, codigoAplicacion, codigoSuite, puerto?, pestana?,
                   canal: 'tableta' | 'telefono' }   (v 2, OT-017: con 'telefono' la web arma su rejilla de 4 columnas)
    La sesión es la misma de la app (sesión única): nunca va en la URL. Solo se le habla al origen de la web configurada.
*/

export const FUENTE_APP = 'porttos-app';
export const FUENTE_WEB = 'porttos-web';
export const VERSION_MARCO = 1;
/** Versión del mensaje 'sesion' que manda la app (la 2 agrega el canal; la web acepta 1 y 2). */
export const VERSION_SESION = 2;
export type CanalMarco = 'tableta' | 'telefono';
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

/** Tableta y teléfono usan el marco si hay una web configurada (OT-017); sin web, la vista nativa. */
export function usarMarcoWeb(base: unknown): boolean {
    return !!urlMarcoWeb(base);
}

/** Canal que se le dice a la web: la tableta ve la web tal cual; el teléfono, su rejilla de 4 columnas. */
export function canalDeDispositivo(esTableta: boolean): CanalMarco {
    return esTableta ? 'tableta' : 'telefono';
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
    ultimo: EstadoMarco | null,
    canal: CanalMarco = 'tableta'
): Record<string, unknown> {
    return {
        fuente: FUENTE_APP, v: VERSION_SESION, tipo: 'sesion', canal,
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
