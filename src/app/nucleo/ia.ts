/*
    Author: German Valencia
    el núcleo (nucleo/) · capa de IA en la app (fase 3 móvil)
    Contratos de los endpoints que ya usa la web (/api/analisis-ia/...) y reglas puras para mostrarlos:
    severidad, horizonte, etiquetas de fuentes del asistente y un markdown mínimo y SEGURO
    (escapa todo el HTML; solo produce <strong>, <em>, <code>, <ul>/<ol>/<li>, <p> y <br>).
*/

export type Severidad = 'info' | 'atencion' | 'critica';

export interface Hallazgo {
    id: number;
    clase: 'ALERTA' | 'TENDENCIA' | 'RESUMEN';
    tipo: string;
    entidad?: string;
    severidad?: Severidad;
    confianza?: number;
    horizonteMinH?: number | null;
    horizonteMaxH?: number | null;
    titulo: string;
    explicacion?: string;
    accionSugerida?: string;
    estado: string;
    resultado?: string | null;
    fecha?: string;
    vigenteHasta?: string;
}

export interface PanelIA {
    puerto: string;
    nombre?: string;
    fecha: string;
    estado?: { disponible?: boolean; motivo?: string; modoSombra?: boolean; [k: string]: unknown };
    alertas: Hallazgo[];
    tendencias: Hallazgo[];
    resumen: Hallazgo | null;
}

export interface TendenciaDestacada {
    codigo: string; titulo: string; unidad?: string; actual?: number | null; referencia?: number | null;
    cambioPct?: number | null; direccion?: string; efecto?: 'empeora' | 'mejora' | 'neutral'; lectura?: string; simulado?: boolean;
}

export interface ResumenTurno {
    id: number; tipo: string; titulo?: string; fecha?: string;
    contenido?: { periodo?: { etiqueta?: string }; origen?: string; titular?: string; loQuePaso?: string[]; loQueViene?: string[]; vigilar?: string[] };
}

export interface FuenteRespuesta { herramienta: string; detalle?: string; }

export interface RespuestaAsistente {
    id: number | null;
    estado: string;
    puerto: string | null;
    decision: 'dentro' | 'frontera' | 'fuera' | null;
    tema: string | null;
    respuesta: string;
    fuentes: FuenteRespuesta[];
    sugerencias: string[];
    verificacion: { ok: boolean; sinRespaldo?: string[] } | null;
}

/** Mismos colores de severidad que el widget Analista IA de la web. */
export const COLOR_SEVERIDAD: Record<Severidad, string> = { critica: '#FF5370', atencion: '#FFB64D', info: '#4099FF' };

export function colorSeveridad(s?: string): string {
    return COLOR_SEVERIDAD[(s as Severidad) || 'info'] || COLOR_SEVERIDAD.info;
}

/** Orden para mostrar: críticas primero, luego por fecha más reciente. */
export function ordenarAlertas(a: Hallazgo[]): Hallazgo[] {
    const r: Record<string, number> = { critica: 2, atencion: 1, info: 0 };
    return [...(a || [])].sort((x, y) => (r[y.severidad || 'info'] - r[x.severidad || 'info']) || String(y.fecha || '').localeCompare(String(x.fecha || '')));
}

/** Alertas del foco de un widget analista (sus tipos de hallazgo), las más graves primero. Sin tipos: todas. */
export function alertasDelFoco(alertas: Hallazgo[], tipos: string[] | undefined, max = 3): { total: number; items: Hallazgo[] } {
    const foco = (tipos || []).map((t) => t.toLowerCase());
    const lista = ordenarAlertas((alertas || []).filter((a) => !foco.length || foco.includes(String(a.tipo || '').toLowerCase())));
    return { total: lista.length, items: lista.slice(0, Math.max(0, max)) };
}

export function horizonteTexto(min?: number | null, max?: number | null): string {
    if (min === null || min === undefined || max === null || max === undefined) return '';
    return min === max ? `${min} h` : `${min}-${max} h`;
}

/** ¿Ya fue calificada (o descartada)? Entonces no se muestran los botones de voto. */
export function yaCalificada(h: Hallazgo): boolean {
    return ['CONFIRMADO', 'FALSO', 'DESCARTADO'].includes(String(h.estado || '').toUpperCase());
}

export const esSimulada = (h: Hallazgo): boolean => /simulad/i.test(String(h.resultado || ''));

/** Etiquetas de las herramientas del asistente (iguales a las del chat de la web). */
export const ETIQUETA_HERRAMIENTA: Record<string, string> = {
    listar_puertos: 'Puertos', foto_operativa: 'Situación actual', serie_kpi: 'Serie de KPI', tendencias: 'Tendencias',
    alertas_tempranas: 'Alertas tempranas', resumenes_turno: 'Cierres de turno', estado_maritimo: 'Operación marítima (AIS)',
    llegadas_buques: 'Llegadas DIMAR'
};

export const etiquetaHerramienta = (h: string): string => ETIQUETA_HERRAMIENTA[h] || h;

/** Historial que se manda al asistente: los últimos 4 turnos respondidos. */
export function historialAsistente(turnos: { pregunta: string; respuesta?: RespuestaAsistente | null }[], max = 4): { pregunta: string; respuesta: string }[] {
    return turnos
        .filter((t) => t.respuesta && t.respuesta.respuesta)
        .slice(-max)
        .map((t) => ({ pregunta: t.pregunta, respuesta: t.respuesta!.respuesta.slice(0, 4000) }));
}

const escapar = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function enLinea(s: string): string {
    return escapar(s)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

/** Markdown mínimo y seguro para las respuestas del asistente (sin enlaces, sin imágenes, sin HTML crudo). */
export function markdownSeguro(texto: string): string {
    const lineas = String(texto || '').replace(/\r/g, '').split('\n');
    const out: string[] = [];
    let lista: 'ul' | 'ol' | null = null;
    let parrafo: string[] = [];
    const cerrarParrafo = () => { if (parrafo.length) { out.push(`<p>${parrafo.map(enLinea).join('<br>')}</p>`); parrafo = []; } };
    const cerrarLista = () => { if (lista) { out.push(`</${lista}>`); lista = null; } };
    for (const l of lineas) {
        const vi = /^\s*[-*•]\s+(.*)$/.exec(l);
        const nu = /^\s*\d+[.)]\s+(.*)$/.exec(l);
        const ti = /^\s*#{1,6}\s+(.*)$/.exec(l);
        if (vi || nu) {
            cerrarParrafo();
            const tipo = vi ? 'ul' : 'ol';
            if (lista !== tipo) { cerrarLista(); out.push(`<${tipo}>`); lista = tipo; }
            out.push(`<li>${enLinea((vi || nu)![1])}</li>`);
        } else if (ti) {
            cerrarParrafo(); cerrarLista();
            out.push(`<p><strong>${enLinea(ti[1])}</strong></p>`);
        } else if (!l.trim()) {
            cerrarParrafo(); cerrarLista();
        } else {
            cerrarLista();
            parrafo.push(l.trim());
        }
    }
    cerrarParrafo(); cerrarLista();
    return out.join('');
}
