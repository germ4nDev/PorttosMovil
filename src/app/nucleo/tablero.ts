/*
    Author: German Valencia
    el núcleo (nucleo/) · tablero móvil
    Contrato de GET /api/movil/tablero/:puerto/:pestana (utils/movil/tablero-movil.js y widgets-movil.js en el API:
    los widgets del layout del usuario en la web, o del por defecto)
    y la geometría pura de las mini-gráficas (sin librerías de gráficas: SVG calculado aquí).
*/

export type EstadoWidget = 'ok' | 'atencion' | 'critico' | 'neutro';

export interface KpiMovil {
    id: string;
    titulo: string;
    valor: number | string | null;
    unidad: string;
    estado: EstadoWidget;
    subtitulo?: string;
    simulado: boolean;
    serie?: number[];
    /** Fuente en tiempo real que actualiza este KPI en la app (p. ej. 'gnl'); el valor del API es el punto de partida. */
    vivo?: string;
    /** true mientras el valor viene del socket (la app lo marca «en vivo»). */
    enVivo?: boolean;
}

export interface ItemLista {
    titulo: string;
    detalle?: string;
    valor?: number | string | null;
    unidad?: string;
    estado?: EstadoWidget;
    progreso?: number | null;
    url?: string;
    fecha?: string;
}

export interface WidgetKpis { tipo: 'kpis'; id: string; titulo: string; items: KpiMovil[]; }
export interface WidgetLista { tipo: 'lista'; id: string; titulo: string; subtitulo?: string; total: number; items: ItemLista[]; }
export interface WidgetGrafica {
    tipo: 'grafica'; id: string; titulo: string; subtitulo?: string;
    forma: 'barras' | 'linea' | 'dona'; unidad?: string;
    labels: string[]; series: { nombre: string; valores: (number | null)[] }[];
}
/** Analista IA de la pestaña (PTT_IA_ANALISTA_*): la app filtra sus alertas por estos tipos de hallazgo. */
export interface WidgetAnalista { tipo: 'analista'; id: string; titulo: string; tipos: string[]; }
/** Mapa logístico (PTT_MAP_WGT_LOGISTICO): en el teléfono es un acceso a la vista de mapa. */
export interface WidgetMapa { tipo: 'mapa'; id: string; titulo: string; }
/** Widget del layout cuyo dato no llegó (o sin versión para el teléfono, `sinVersionMovil`): tarjeta con su título, en su celda. */
export interface WidgetVacio { tipo: 'vacio'; id: string; titulo: string; sinVersionMovil?: boolean; }
/** Celda del widget en el gridster de la web (12 columnas): la app arma con ella su rejilla sin huecos (rejilla.ts). */
export interface CeldaLayout { x: number; y: number; cols: number; rows: number; }
/** Todo widget trae `codigo`: el código del widget de la web del que sale (si vino del layout), y `celda` si el layout la tiene. */
/** Widget que la app dibuja con su propio componente y sus propios datos, como la web (p. ej. las gráficas de GNL en vivo,
 *  OT-005): el API solo manda el código y los textos; el registro código → componente está en tablero.page. */
export interface WidgetComponente { tipo: 'componente'; id: string; codigo: string; titulo: string; subtitulo?: string; }
export type WidgetMovil = (WidgetKpis | WidgetLista | WidgetGrafica | WidgetAnalista | WidgetMapa | WidgetVacio | WidgetComponente) & { codigo?: string; celda?: CeldaLayout };

/** De dónde salió la lista de widgets: el layout del usuario en la web o el por defecto; 'sin_layout' = la pestaña no tiene
 *  widgets configurados (OT-008: ya no hay receta inventada). */
export type OrigenLayout = 'usuario' | 'defecto' | 'sin_layout';

export interface TableroMovil {
    puerto: string;
    nombrePuerto?: string;
    pestana: string;
    modulo: string;
    generadoEn: string;
    simulado: boolean;
    widgets: WidgetMovil[];
    fallidos?: string[];
    layout?: OrigenLayout;
    /** Widgets del layout sin versión para el teléfono: van en su celda como tarjeta vacía (OT-008; antes se listaban aparte). */
    sinVersionMovil?: string[];
    /** Widgets del layout cuyo dato no llegó (tarjeta vacía con su título; no se inventa nada). */
    sinDatos?: string[];
    /** true cuando cada widget trae su `celda` del layout de la web: la app dibuja la rejilla tipo gridster (2026-10-25). */
    rejilla?: boolean;
}

/** Colores de estado: los semánticos de la web (text-success, text-warning, text-danger). */
export const COLOR_ESTADO: Record<EstadoWidget, string> = {
    ok: '#2ED8B6',
    atencion: '#FFB64D',
    critico: '#FF5370',
    neutro: '#4099FF'
};

/** Paleta de series (mismos colores de las pestañas de la web). */
export const PALETA_SERIES: readonly string[] = ['#4099FF', '#2ED8B6', '#FFB64D', '#FF5370', '#00BCD4', '#7C5CFF', '#9C9C9C'];

/** 1234567 → "1,2 M" · 15300 → "15,3 mil" · 87.5 → "87,5" (es) / "1.2M", "15.3K" (en). Textos pasan tal cual. */
export function formatoValor(valor: number | string | null | undefined, idioma = 'es'): string {
    if (valor === null || valor === undefined || valor === '') return '—';
    if (typeof valor === 'string') return valor;
    if (!Number.isFinite(valor)) return '—';
    const locale = idioma === 'en' ? 'en-US' : 'es-CO';
    const abs = Math.abs(valor);
    const f = (n: number, d: number) => n.toLocaleString(locale, { maximumFractionDigits: d });
    if (abs >= 1e6) return `${f(valor / 1e6, 1)}${idioma === 'en' ? 'M' : ' M'}`;
    if (abs >= 1e4) return `${f(valor / 1e3, 1)}${idioma === 'en' ? 'K' : ' mil'}`;
    return f(valor, abs < 10 ? 1 : 0);
}

/** Variación entre el primer y el último punto de una serie, en %. null si no se puede calcular. */
export function variacionSerie(serie: number[] | undefined): number | null {
    if (!serie || serie.length < 2) return null;
    const a = serie[0];
    const b = serie[serie.length - 1];
    if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0) return null;
    return Math.round(((b - a) / Math.abs(a)) * 1000) / 10;
}

/** Trazo SVG ("M x,y L ...") de una línea que ocupa ancho × alto con un margen para el grosor. */
export function trazoLinea(valores: (number | null)[], ancho: number, alto: number, margen = 2): string {
    const v = valores.map((x) => (x === null || !Number.isFinite(x) ? null : x));
    const nums = v.filter((x): x is number => x !== null);
    if (nums.length < 2) return '';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const rango = max - min || 1;
    const paso = (ancho - margen * 2) / (v.length - 1);
    let d = '';
    let abierto = false;
    v.forEach((x, i) => {
        if (x === null) { abierto = false; return; }
        const px = margen + i * paso;
        const py = alto - margen - ((x - min) / rango) * (alto - margen * 2);
        d += `${abierto ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)} `;
        abierto = true;
    });
    return d.trim();
}

/** Área bajo la línea (misma escala que trazoLinea), para el relleno suave. */
export function trazoArea(valores: number[], ancho: number, alto: number, margen = 2): string {
    const linea = trazoLinea(valores, ancho, alto, margen);
    if (!linea || valores.some((x) => x === null || !Number.isFinite(x))) return '';
    return `${linea} L${(ancho - margen).toFixed(1)},${alto} L${margen.toFixed(1)},${alto} Z`;
}

export interface Barra { x: number; y: number; ancho: number; alto: number; valor: number; serie: number; }

/** Barras agrupadas (una por serie dentro de cada categoría), escala desde 0. */
export function barras(series: { valores: (number | null)[] }[], ancho: number, alto: number, separacion = 0.3): Barra[] {
    const n = Math.max(0, ...series.map((s) => s.valores.length));
    if (!n || !series.length) return [];
    const max = Math.max(0, ...series.flatMap((s) => s.valores.map((v) => (v === null || !Number.isFinite(v) ? 0 : v))));
    const grupo = ancho / n;
    const util = grupo * (1 - separacion);
    const cada = util / series.length;
    const r: Barra[] = [];
    for (let i = 0; i < n; i++) {
        series.forEach((s, j) => {
            const valor = s.valores[i] ?? 0;
            const h = max > 0 ? Math.max(0, (valor / max) * alto) : 0;
            r.push({ x: i * grupo + (grupo - util) / 2 + j * cada, y: alto - h, ancho: Math.max(1, cada - 1), alto: h, valor, serie: j });
        });
    }
    return r;
}

export interface Porcion { d: string; valor: number; pct: number; indice: number; }

/** Porciones de una dona (radio exterior r, grosor g) centradas en (r, r). Ignora negativos y nulos. */
export function porcionesDona(valores: (number | null)[], r: number, g: number): Porcion[] {
    const v = valores.map((x) => (x === null || !Number.isFinite(x) || x < 0 ? 0 : x));
    const total = v.reduce((a, b) => a + b, 0);
    if (total <= 0) return [];
    const ri = r - g;
    const punto = (ang: number, radio: number) => `${(r + radio * Math.sin(ang)).toFixed(2)},${(r - radio * Math.cos(ang)).toFixed(2)}`;
    let ini = 0;
    const res: Porcion[] = [];
    v.forEach((x, indice) => {
        if (x <= 0) return;
        const pct = x / total;
        // Una porción del 100 % se dibuja en dos mitades (un arco SVG no puede cerrar el círculo completo)
        const fin = ini + Math.min(pct, 0.9999) * Math.PI * 2;
        const grande = fin - ini > Math.PI ? 1 : 0;
        const d = `M${punto(ini, r)} A${r},${r} 0 ${grande} 1 ${punto(fin, r)} L${punto(fin, ri)} A${ri},${ri} 0 ${grande} 0 ${punto(ini, ri)} Z`;
        res.push({ d, valor: x, pct: Math.round(pct * 1000) / 10, indice });
        ini += pct * Math.PI * 2;
    });
    return res;
}
