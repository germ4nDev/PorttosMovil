/*
    Author: German Valencia
    el núcleo (nucleo/) · dispositivo, puertos y encabezado
    Reglas puras para: teléfono vs. tableta (y su orientación fija), lista de puertos
    y el texto de fecha del encabezado (igual que la web: "SÁBADO, 24 DE OCTUBRE DE 2026 · UTC-5").
*/

export type ClaseDispositivo = 'telefono' | 'tableta';
export type Orientacion = 'portrait' | 'landscape';

/** Lado corto ≥ 600 px CSS = tableta (criterio estándar de Android e iPad mini en adelante). */
export const UMBRAL_TABLETA = 600;

export function claseDispositivo(ancho: number, alto: number): ClaseDispositivo {
    return Math.min(ancho || 0, alto || 0) >= UMBRAL_TABLETA ? 'tableta' : 'telefono';
}

/** Teléfono anclado en vertical; tableta anclada en horizontal. */
export function orientacionObjetivo(clase: ClaseDispositivo): Orientacion {
    return clase === 'tableta' ? 'landscape' : 'portrait';
}

export interface PuertoMovil {
    id: string;
    nombre: string;
    /** Clave que usa el API y DashboardService.puertoSeleccionado$ (nombre en mayúsculas). */
    clave: string;
}

export const PUERTO_TODOS: PuertoMovil = { id: 'TODOS', nombre: 'Todos', clave: 'TODOS' };

/** Acepta {data:[...]} o [...] del API /api/puertos; descarta inactivos; ordena por nombre. */
export function normalizarPuertos(resp: any): PuertoMovil[] {
    const lista: any[] = Array.isArray(resp) ? resp : Array.isArray(resp?.data) ? resp.data : [];
    return lista
        .filter((p) => p && p.nombre && p.estado !== false)
        .map((p) => ({
            id: String(p.id_puerto ?? p.id ?? p.nombre),
            nombre: String(p.nombre),
            clave: String(p.nombre).trim().toUpperCase()
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** La clave guardada si existe en la lista; si no, TODOS. */
export function puertoInicial(lista: PuertoMovil[], guardada?: string | null): string {
    if (guardada && (guardada === 'TODOS' || lista.some((p) => p.clave === guardada))) return guardada;
    return 'TODOS';
}

/** "UTC-5", "UTC+1", "UTC+5:30" a partir de Date.getTimezoneOffset(). */
export function etiquetaUTC(offsetMinutos: number): string {
    const total = -offsetMinutos;
    const signo = total >= 0 ? '+' : '-';
    const abs = Math.abs(total);
    const h = Math.floor(abs / 60);
    const m = abs % 60;
    return `UTC${signo}${h}${m ? ':' + String(m).padStart(2, '0') : ''}`;
}

/** Fecha larga en mayúsculas en el idioma activo, más la zona horaria. */
export function fechaEncabezado(fecha: Date, idioma: string): string {
    const locale = idioma === 'en' ? 'en-US' : 'es-CO';
    const texto = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(fecha);
    return `${texto.toLocaleUpperCase(locale)} · ${etiquetaUTC(fecha.getTimezoneOffset())}`;
}

export function horaEncabezado(fecha: Date): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(fecha.getHours())}:${p(fecha.getMinutes())}:${p(fecha.getSeconds())}`;
}
