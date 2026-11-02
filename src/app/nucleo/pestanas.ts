/*
    Author: German Valencia
    el núcleo (nucleo/) · pestañas
    Catálogo visual de las pestañas de la Torre de Control (mismo ícono y color que la web)
    y el orden según las preferencias del usuario (misma regla que torre-control.component).
    OT-008 (2026-10-29): el ícono y el color salen de la BD (PTLPestanas.icono / .color, migración 020, en /api/pestanas);
    ESTILO_PESTANAS queda solo como respaldo cuando la columna viene NULL o la migración no está corrida.
*/

export interface PestanaMaestra {
    codigoPestana: string;
    nombrePestana?: string;
    /** Ícono y color de la BD (PTLPestanas, migración 020); null sin la migración (OT-008). */
    icono?: string | null;
    color?: string | null;
    [k: string]: any;
}

export interface PreferenciaPestana {
    codigoPestana: string;
    posicion?: number;
}

export type IconoPestana = 'barco' | 'camion' | 'bodega' | 'contenedor' | 'gnl' | 'mapa' | 'noticias' | 'granel' | 'suelta' | 'capacidad' | 'tablero';

export interface EstiloPestana {
    icono: IconoPestana;
    color: string;
    /** true si en el teléfono tiene vista propia (no solo widgets). */
    vistaPropia?: boolean;
}

/** Respaldo si la BD no trae ícono o color (los mismos valores que siembra la migración 020). */
export const ESTILO_PESTANAS: Record<string, EstiloPestana> = {
    TLC_MARITIMO_001: { icono: 'barco', color: '#00BCD4' },
    TLC_VIRTUAL_GATE_001: { icono: 'camion', color: '#FFB64D' },
    TLC_BODEGAS_001: { icono: 'bodega', color: '#4099FF' },
    TLC_CONTENEDORES_001: { icono: 'contenedor', color: '#2ED8B6' },
    TLC_GRANEL_001: { icono: 'granel', color: '#2ED8B6' },
    TLC_SUELTA_001: { icono: 'suelta', color: '#FFB64D' },
    TLC_GNL_001: { icono: 'gnl', color: '#FF5370' },
    TLC_CAPACIDAD_001: { icono: 'capacidad', color: '#00BCD4' },
    TLC_NOTICIAS_001: { icono: 'noticias', color: '#4099FF' },
    TLC_NOTICIAS: { icono: 'noticias', color: '#4099FF' },
    TLC_MAPA_001: { icono: 'mapa', color: '#FF5370', vistaPropia: true }
};

export const ESTILO_DEFECTO: EstiloPestana = { icono: 'tablero', color: '#9C9C9C' };

const ICONOS: readonly IconoPestana[] = ['barco', 'camion', 'bodega', 'contenedor', 'gnl', 'mapa', 'noticias', 'granel', 'suelta', 'capacidad', 'tablero'];
const COLOR_VALIDO = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Ícono y color de la pestaña: los de la BD (`icono`, `color` de /api/pestanas) y, si faltan o no son válidos, el respaldo. */
export function estiloPestana(codigo: string, desdeBD?: { icono?: string | null; color?: string | null } | null): EstiloPestana {
    const respaldo = ESTILO_PESTANAS[codigo] || ESTILO_DEFECTO;
    const icono = String(desdeBD?.icono ?? '').trim().toLowerCase() as IconoPestana;
    const color = String(desdeBD?.color ?? '').trim();
    return {
        ...respaldo,
        icono: ICONOS.includes(icono) ? icono : respaldo.icono,
        color: COLOR_VALIDO.test(color) ? color.toUpperCase() : respaldo.color
    };
}

/**
 * Pestañas visibles: las preferencias del usuario (sin duplicados, por posición) cruzadas con el maestro;
 * si no hay preferencias, las de la caché; si tampoco, las 3 primeras del maestro.
 */
export function ordenarPestanas(
    maestro: PestanaMaestra[],
    preferencias: PreferenciaPestana[] | null | undefined,
    cache?: PestanaMaestra[] | null
): PestanaMaestra[] {
    const lista = Array.isArray(maestro) ? maestro : [];
    if (Array.isArray(preferencias) && preferencias.length > 0) {
        const unicas = preferencias.filter((p, i, arr) => i === arr.findIndex((q) => q.codigoPestana === p.codigoPestana));
        return unicas
            .slice()
            .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))
            .map((p) => lista.find((m) => m.codigoPestana === p.codigoPestana))
            .filter((m): m is PestanaMaestra => !!m);
    }
    if (Array.isArray(cache) && cache.length > 0) return cache;
    return lista.slice(0, 3);
}

/** La pestaña guardada si sigue visible; si no, la primera. */
export function pestanaInicial(visibles: PestanaMaestra[], guardada?: string | null): string {
    if (guardada && visibles.some((p) => p.codigoPestana === guardada)) return guardada;
    return visibles[0]?.codigoPestana || '';
}
