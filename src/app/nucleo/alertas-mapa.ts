/*
    Author: German Valencia
    el núcleo (nucleo/) · alertas del mapa (OT-007, 2026-10-29)
    Mismo contrato que la web (alertas-mapa.service.ts): bitácora de GET /api/alertas-mapa?puerto=&limite= y alertas nuevas
    por el evento 'alerta-mapa' de la sala puerto:<PUERTO>:mapa. Aquí solo reglas puras: colores, orden y bitácora.
*/

export type NivelAlertaMapa = 'info' | 'warning' | 'error';

export interface AlertaMapa {
    id: string;
    nivel: NivelAlertaMapa;
    categoria: string;
    titulo: string;
    mensaje: string;
    coordenadas: [number, number] | null;
    entidad: string;
    simulado: boolean;
    fecha: string;
    puerto?: string;
}

/** Colores de la web (pulso-info / pulso-warning / pulso-error del mapa). */
export const COLOR_ALERTA_MAPA: Record<NivelAlertaMapa, string> = { info: '#2F96B4', warning: '#F89406', error: '#BD362F' };

export const MAX_BITACORA_MAPA = 20;

const NIVELES: NivelAlertaMapa[] = ['info', 'warning', 'error'];

/** ¿Es una alerta que se puede pintar? (nivel conocido, id y, si trae coordenadas, que sean lon/lat válidas) */
export function alertaValida(a: unknown): a is AlertaMapa {
    const x = a as AlertaMapa | null;
    return !!x && typeof x.id === 'string' && x.id.length > 0 && NIVELES.includes(x.nivel);
}

export function tieneCoordenadas(a: AlertaMapa): boolean {
    const c = a.coordenadas;
    return Array.isArray(c) && c.length === 2 && c.every(Number.isFinite) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 90
        && !(c[0] === 0 && c[1] === 0);
}

/** Puerto en mayúsculas, sin tildes y con _ en lugar de signos (como SocketService.normalizarPuerto de la web). */
export function normalizarPuertoMapa(p: string | null | undefined): string {
    return String(p || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
}

/** La alerta es del puerto que se mira (las que no dicen puerto se aceptan, como en la web). */
export function esDelPuerto(a: AlertaMapa, puerto: string): boolean {
    return !a.puerto || normalizarPuertoMapa(a.puerto) === normalizarPuertoMapa(puerto);
}

/** Bitácora: la más reciente primero, sin repetidas (por id), máximo MAX_BITACORA_MAPA. */
export function fusionarAlertas(actual: AlertaMapa[], nuevas: AlertaMapa[]): AlertaMapa[] {
    const porId = new Map<string, AlertaMapa>();
    for (const a of [...nuevas, ...actual]) if (alertaValida(a) && !porId.has(a.id)) porId.set(a.id, a);
    const t = (a: AlertaMapa) => { const n = Date.parse(a.fecha); return Number.isFinite(n) ? n : 0; };
    return [...porId.values()].sort((a, b) => t(b) - t(a)).slice(0, MAX_BITACORA_MAPA);
}
