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

/** CC-242 · Punto de control (geocerca de una infraestructura con métricas): estado del motor y métricas en texto JSON. */
export type EstadoPuntoControl = 'NORMAL' | 'ATENCION' | 'CRITICO' | 'SIN_DATO';
export interface PropPuntoControl { id: string; nombre: string; tipo: string | null; estado: EstadoPuntoControl; simulado: boolean; metricas: string; }
export interface MetricaPuntoControl { nombre: string; valor: number | null; unidad: string | null; estado: EstadoPuntoControl; fecha_dato: string | null; simulado: boolean; }

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
    /** CC-242 · Puntos de control con su estado; ausente en versiones viejas del API */
    puntosControl?: { type: 'FeatureCollection'; features: { type: 'Feature'; geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }; properties: PropPuntoControl }[] };
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
    if (s.estado === 'sin_registro' || !s.ultima) return { clave: 'MOVIL.NUCLEO.NO_AIS_SIGNAL_SOURCE_HAS_NOT', hace: '' };
    const h = s.horasSinSenal ?? 0;
    return { clave: 'MOVIL.NUCLEO.NO_AIS_SIGNAL_HACE_SOURCE_NOT', hace: h >= 48 ? `${Math.floor(h / 24)} d` : haceTexto(h * 60) };
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
/** CC-242 · Mismos colores del mapa de la web (COLORES_MAPA.puntoControl) */
export const COLOR_PUNTO_CONTROL: Record<EstadoPuntoControl, string> = { NORMAL: '#16a34a', ATENCION: '#f59e0b', CRITICO: '#dc2626', SIN_DATO: '#94a3b8' };
/** Llave del texto de cada estado (las mismas de la web) */
export const LLAVE_ESTADO_PUNTO: Record<EstadoPuntoControl, string> = {
    NORMAL: 'COMMON.NORMAL', ATENCION: 'COMMON.CONTROL_ATTENTION', CRITICO: 'COMMON.CONTROL_CRITICAL', SIN_DATO: 'COMMON.CONTROL_NO_DATA'
};

/** Color de relleno de la geocerca por estado (expresión de MapLibre). */
export function expresionColorPuntoControl(): unknown[] {
    return ['match', ['get', 'estado'], 'NORMAL', COLOR_PUNTO_CONTROL.NORMAL, 'ATENCION', COLOR_PUNTO_CONTROL.ATENCION, 'CRITICO', COLOR_PUNTO_CONTROL.CRITICO, COLOR_PUNTO_CONTROL.SIN_DATO];
}

/** Métricas de la ficha desde el texto JSON de la capa; ilegible = ninguna. */
export function metricasPuntoControl(texto: string | null | undefined): MetricaPuntoControl[] {
    try {
        const lista = JSON.parse(texto || '[]');
        return Array.isArray(lista) ? lista : [];
    } catch {
        return [];
    }
}
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

// ==========================================================
// CC-243 (OT-037 paso 2): capas del mapa por usuario y por rol
// ==========================================================
/** Capas de la vista nativa (respaldo sin conexión). */
export type CapaNativa = 'puntosControl' | 'geocercas' | 'naves' | 'camiones' | 'eventos';

/** Código de cada capa nativa en el catálogo único (TCL_CapasMapa, 055; el mismo id de la web en mapa-capas.ts). */
export const CAPA_CATALOGO: Record<CapaNativa, string> = {
  puntosControl: 'puntos-control',
  geocercas: 'geocercas-kpi',
  naves: 'naves',
  camiones: 'terrestre',
  eventos: 'accidentes'
};

export const CAPAS_NATIVAS = Object.keys(CAPA_CATALOGO) as CapaNativa[];

/** Respuesta de GET /api/capas-mapa/mias?canal=telefono (solo lo que usa la vista nativa). */
export interface CapasMapaMias { capas: Array<{ codigo: string; visible: boolean }>; vista: string | null; }

/**
 * Qué capas nativas ve el usuario (por su rol, en el canal teléfono) y cuáles salen encendidas. Sin respuesta (null: sin red o sin la
 * 055) se ven todas encendidas, como antes.
 */
export function capasNativas(mias: CapasMapaMias | null): { permitidas: CapaNativa[]; visibles: Record<CapaNativa, boolean> } {
  if (!mias) return { permitidas: [...CAPAS_NATIVAS], visibles: Object.fromEntries(CAPAS_NATIVAS.map((c) => [c, true])) as Record<CapaNativa, boolean> };
  const suyas = new Map(mias.capas.map((c) => [c.codigo, c.visible]));
  const permitidas = CAPAS_NATIVAS.filter((c) => suyas.has(CAPA_CATALOGO[c]));
  const visibles = Object.fromEntries(CAPAS_NATIVAS.map((c) => [c, !!suyas.get(CAPA_CATALOGO[c])])) as Record<CapaNativa, boolean>;
  return { permitidas, visibles };
}

/** Preferencia a guardar desde la vista nativa: solo las capas nativas que ve; las demás del canal se quedan como estaban. */
export function estadoNativoParaGuardar(mias: CapasMapaMias, visibles: Record<CapaNativa, boolean>): Record<string, boolean> {
  const estado: Record<string, boolean> = Object.fromEntries(mias.capas.map((c) => [c.codigo, c.visible]));
  for (const c of CAPAS_NATIVAS) if (CAPA_CATALOGO[c] in estado) estado[CAPA_CATALOGO[c]] = !!visibles[c];
  return estado;
}
