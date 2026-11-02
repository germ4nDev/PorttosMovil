/*
    Author: German Valencia
    el núcleo (nucleo/) · mapa logístico (fase 4 móvil)
    Contrato de GET /api/movil/mapa/:puerto, estilos base (los mismos de MapTiler que usa la web) y colores por estado.
*/

export type EstadoNave = 'atracada' | 'fondeada' | 'movimiento' | 'avisada' | 'zarpada' | 'sin_dato';
export type EstiloBase = 'calles' | 'terreno' | 'satelite';

export interface PuntoGeo<P> { type: 'Feature'; geometry: { type: 'Point'; coordinates: [number, number] }; properties: P; }
export interface Coleccion<P> { type: 'FeatureCollection'; features: PuntoGeo<P>[]; }

export interface PropNave { id: string; nombre: string; estado: EstadoNave; velocidad: number | null; rumbo: number | null; tipo?: string | null;
    instalacion?: string | null; agencia?: string | null; eta?: string | null; minutos: number | null; }
export interface PropCamion { id: string; placa: string | null; estado: string; velocidad: number | null; rumbo: number | null; tipo?: string | null; }
export interface PropEvento { id: string; tipo: string; descripcion: string | null; corredor: string | null; sector: string | null; grave: boolean; }

export interface PropGeocerca { id: string; nombre: string; tipo: string | null; color: string; estadoKpi: string | null; camiones: number; naves: number; }

export interface MapaMovil {
    puerto: string;
    nombrePuerto?: string;
    generadoEn: string;
    centro: [number, number] | null;
    limites: [[number, number], [number, number]] | null;
    naves: Coleccion<PropNave>;
    camiones: Coleccion<PropCamion>;
    eventos: Coleccion<PropEvento>;
    /** Geocercas de los faros del puerto (polígonos con su color y conteos, OT-007); ausente en versiones viejas del API */
    geocercas?: { type: 'FeatureCollection'; features: { type: 'Feature'; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }; properties: PropGeocerca }[] };
    conteos: { naves: number; fondeadas: number; atracadas: number; enMovimiento: number; camiones: number; eventos: number; eventosGraves: number };
    fallidas?: string[];
    /** Señal AIS de la caja del puerto (utils/senal-ais.js del API, OT-007); null sin puerto o en versiones viejas del API */
    senalAis?: SenalAis | null;
}

export interface SenalAis { estado: 'en_vivo' | 'sin_senal' | 'sin_registro'; ultima: string | null; horasSinSenal: number | null; }

/**
 * Aviso del mapa cuando el AIS no reporta en el puerto (datos honestos): la clave de traducción y «hace cuánto».
 * null cuando la señal está en vivo o no se conoce. Mismo criterio que el aviso de la web (senal-ais.ts).
 */
export function avisoSenalAis(s: SenalAis | null | undefined): { clave: string; hace: string } | null {
    if (!s || s.estado === 'en_vivo') return null;
    if (s.estado === 'sin_registro' || !s.ultima) return { clave: 'MOVIL.MAPA.SIN_REGISTRO_AIS', hace: '' };
    const h = s.horasSinSenal ?? 0;
    return { clave: 'MOVIL.MAPA.SIN_SENAL_AIS', hace: h >= 48 ? `${Math.floor(h / 24)} d` : haceTexto(h * 60) };
}

/** Colores por estado de la nave (los de la convención del mapa de la web). */
export const COLOR_NAVE: Record<EstadoNave, string> = {
    atracada: '#2ED8B6',
    fondeada: '#FFB64D',
    movimiento: '#4099FF',
    avisada: '#00BCD4',
    zarpada: '#9C9C9C',
    sin_dato: '#7A8A99'
};

export const COLOR_CAMION = '#7C5CFF';
export const COLOR_EVENTO = { grave: '#FF5370', leve: '#FFB64D' } as const;

/** URL del estilo de MapTiler (mismos mapas que la web: streets-v2, topo-v2 y hybrid, con su versión oscura). */
export function estiloMapa(base: EstiloBase, oscuro: boolean, clave: string): string {
    const k = encodeURIComponent(clave || '');
    if (base === 'satelite') return `https://api.maptiler.com/maps/hybrid/style.json?key=${k}`;
    if (base === 'terreno') return `https://api.maptiler.com/maps/${oscuro ? 'topo-v2-dark' : 'topo-v2'}/style.json?key=${k}`;
    return `https://api.maptiler.com/maps/${oscuro ? 'streets-v2-dark' : 'streets-v2'}/style.json?key=${k}`;
}

/** Expresión de MapLibre para colorear naves por estado (match sobre la propiedad 'estado'). */
export function expresionColorNave(): unknown[] {
    const pares = Object.entries(COLOR_NAVE).flatMap(([e, c]) => [e, c]);
    return ['match', ['get', 'estado'], ...pares, COLOR_NAVE.sin_dato];
}

/** Hace cuánto (texto corto): 45 → "45 min", 130 → "2 h 10 min". */
export function haceTexto(min: number | null | undefined): string {
    if (min === null || min === undefined || !Number.isFinite(min)) return '';
    if (min < 60) return `${Math.round(min)} min`;
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    return m ? `${h} h ${m} min` : `${h} h`;
}

/** ¿Los límites son válidos para encuadrar el mapa? */
export function limitesValidos(l: MapaMovil['limites']): boolean {
    if (!l) return false;
    const [[o, s], [e, n]] = l;
    return [o, s, e, n].every(Number.isFinite) && o < e && s < n;
}
