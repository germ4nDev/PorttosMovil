/*
    Author: German Valencia
    el núcleo (nucleo/) · GNL en tiempo real (fase B de «la app igual a la web», 2026-10-25)
    La web recibe la telemetría GNL por socket (sala puerto:<PUERTO>:gnl, evento 'gnl-lectura-viva', un pulso por brazo
    y por segundo), la normaliza por brazo y la consolida (GnlStateService) y calcula cada KPI (gnl-dashboard.valorKpi).
    Aquí está esa misma lógica, pura, para la app móvil (y para que la web la adopte después, sin duplicarla):
      normalizarPulsoGnl(pulso, previo)   un pulso → lectura de un brazo
      consolidarGnl(lecturas)             todos los brazos → una lectura (flujo, BOG, inyección y descarga se suman;
                                          presión, temperatura, nivel de tanques y poder calorífico se promedian)
      valorKpiGnl(codigo, consolidado)    código PTT_GNL_KPI_* → { valor, unidad, estado } (null si no hay dato: no se inventa)
*/
import type { EstadoWidget } from './tablero';

export interface LecturaGnl {
    brazo: string;
    puerto: string;
    timestamp: string;
    flujo: number | null;
    presion: number | null;
    temperatura: number | null;
    bog: number | null;
    volumenTanque: number | null;
    inyeccion: number | null;
    descarga: number | null;
    poderCalorifico: number | null;
    alarma: boolean;
    evento: string | null;
    simulado: boolean;
}

export interface ConsolidadoGnl extends Omit<LecturaGnl, 'brazo' | 'alarma' | 'evento'> {
    brazos: number;
    brazosEnAlarma: number;
}

export interface KpiGnlVivo {
    valor: number | string | null;
    unidad: string;
    estado: EstadoWidget;
    subtitulo?: string;
    simulado?: boolean;
}

/** KPI de GNL en vivo: títulos, unidades y subtítulos iguales a la web (kpi-card-tcl, mapaGnlKpis; el medidor de presión es
 *  gnl-gauge-widget). Decisión del usuario (2026-10-25): la app y la web muestran lo mismo. Lista espejo en el API: GNL_VIVO
 *  de utils/movil/widgets-movil.js (hay prueba). Regla 22: los títulos son ese contrato (no se pintan: el título sale del catálogo);
 *  los subtítulos son llaves MOVIL.GNL.SUB.* y la plantilla los traduce. */
export const KPIS_GNL_VIVO: Readonly<Record<string, { titulo: string; unidad: string; subtitulo?: string }>> = Object.freeze({
    PTT_GNL_KPI_FLUJO: { titulo: 'Caudal de flujo', unidad: 'm³/h' }, // i18n-contrato
    PTT_GNL_KPI_PRESION: { titulo: 'Presión', unidad: 'psi' }, // i18n-contrato
    PTT_GNL_GAUGE_PRESION: { titulo: 'Presión de línea', unidad: 'psi', subtitulo: 'MOVIL.GNL.SUB.TELEMETRIA_SCADA' }, // i18n-contrato
    PTT_GNL_KPI_TEMP: { titulo: 'Temperatura', unidad: '°C' }, // i18n-contrato
    PTT_GNL_KPI_BOG: { titulo: 'BOG', unidad: 'kg/h', subtitulo: 'MOVIL.GNL.SUB.BOIL_OFF' }, // i18n-contrato
    PTT_GNL_KPI_DESCARGA: { titulo: 'Descarga de buque', unidad: 'm³/h', subtitulo: 'MOVIL.GNL.SUB.TELEMETRIA_ENTRADA' }, // i18n-contrato
    PTT_GNL_KPI_INYECCION: { titulo: 'Inyección a red', unidad: 'm³/h', subtitulo: 'MOVIL.GNL.SUB.SALIDA_RED' }, // i18n-contrato
    PTT_GNL_KPI_TNQ_OCUP: { titulo: 'Ocupación de planta', unidad: '%', subtitulo: 'MOVIL.GNL.SUB.LLENADO_TANQUES' }, // i18n-contrato
    PTT_GNL_KPI_VOLUMEN: { titulo: 'Energía transferida', unidad: 'MMBTU', subtitulo: 'MOVIL.GNL.SUB.ENERGIA_SEGUNDO' }, // i18n-contrato
    PTT_GNL_KPI_CALIDAD: { titulo: 'Poder calorífico', unidad: 'BTU/ft³', subtitulo: 'MOVIL.GNL.SUB.CALIDAD_MEZCLA' }, // i18n-contrato
    PTT_GNL_KPI_CALORIFICO: { titulo: 'Poder calorífico', unidad: 'BTU/ft³' }, // i18n-contrato
    PTT_GNL_KPI_ALERTAS: { titulo: 'Alarmas activas', unidad: '' }, // i18n-contrato
    PTT_GNL_KPI_ODO_MMBTU: { titulo: 'Energía acumulada', unidad: 'MMBTU', subtitulo: 'MOVIL.GNL.SUB.DESDE_APERTURA' }, // i18n-contrato
});

/** Subtítulo por defecto de la web cuando la tarjeta no trae uno propio (modo «TODOS» = todos los brazos). */
const SUBTITULO_CONSOLIDADO = 'MOVIL.GNL.SUB.CONSOLIDADO';

/** Energía del último pulso (MMBTU), misma fórmula que la web: caudal × 22,4 / 3600. */
export function energiaPulsoGnl(c: ConsolidadoGnl | null): number | null {
    if (!c || c.flujo === null) return null;
    return c.flujo > 0 ? Math.round(((c.flujo * 22.4) / 3600) * 10000) / 10000 : 0;
}

const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
};
const primero = (o: Record<string, unknown>, ...claves: string[]): number | null => {
    for (const c of claves) {
        const n = num(o[c]);
        if (n !== null) return n;
    }
    return null;
};
const redondear = (v: number | null, d = 2): number | null => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d);

/** Un pulso del socket → lectura de un brazo (mismos nombres alternativos que acepta la web). */
export function normalizarPulsoGnl(pulso: Record<string, unknown>, previo?: LecturaGnl | null): LecturaGnl {
    const p = pulso || {};
    const tomar = (actual: number | null, anterior: number | null | undefined) => (actual !== null ? actual : anterior ?? null);
    return {
        brazo: String(p['codigo_segmento'] ?? p['brazo_id'] ?? p['id_brazo'] ?? p['segmento'] ?? p['brazo'] ?? 'BRAZO-01').trim().toUpperCase(),
        puerto: String(p['id_puerto'] ?? p['puerto'] ?? '').trim().toUpperCase(),
        timestamp: String(p['timestamp'] ?? p['fecha_hora'] ?? new Date().toISOString()),
        flujo: tomar(primero(p, 'flujo_m3', 'flujo_m3h', 'caudal_m3h', 'flujo'), previo?.flujo),
        presion: tomar(primero(p, 'presion_psi', 'presion_bar', 'presion'), previo?.presion),
        temperatura: tomar(primero(p, 'temp_ducto', 'temperatura_c', 'temperatura_celsius', 'temperatura'), previo?.temperatura),
        bog: tomar(primero(p, 'bog_m3h', 'bog_kg_h', 'bog', 'evaporacion'), previo?.bog),
        volumenTanque: tomar(primero(p, 'volumen_almacenado', 'volumen_tanque_m3', 'volumen'), previo?.volumenTanque),
        inyeccion: tomar(primero(p, 'inyeccion', 'inyeccion_red'), previo?.inyeccion),
        descarga: tomar(primero(p, 'descarga_buque', 'tasa_descarga_m3h', 'descarga'), previo?.descarga),
        poderCalorifico: tomar(primero(p, 'poder_calorifico', 'poder_calorifico_btu', 'btu_scf'), previo?.poderCalorifico),
        alarma: p['alarma_activa'] === true || p['alarma_activa'] === 1 || p['alarma_activa'] === '1',
        evento: p['event_type'] ? String(p['event_type']) : null,
        simulado: p['simulado'] === true || previo?.simulado === true,
    };
}

/** Todos los brazos → una lectura del puerto (igual que el modo «TODOS» de la web). */
export function consolidarGnl(lecturas: LecturaGnl[]): ConsolidadoGnl | null {
    const l = (lecturas || []).filter(Boolean);
    if (!l.length) return null;
    const valores = (f: (x: LecturaGnl) => number | null) => l.map(f).filter((v): v is number => v !== null);
    const suma = (f: (x: LecturaGnl) => number | null) => { const v = valores(f); return v.length ? redondear(v.reduce((a, b) => a + b, 0)) : null; };
    const prom = (f: (x: LecturaGnl) => number | null) => { const v = valores(f); return v.length ? redondear(v.reduce((a, b) => a + b, 0) / v.length) : null; };
    const ultimo = [...l].sort((a, b) => a.timestamp.localeCompare(b.timestamp))[l.length - 1];
    return {
        puerto: ultimo.puerto,
        timestamp: ultimo.timestamp,
        flujo: suma((x) => x.flujo),
        bog: suma((x) => x.bog),
        inyeccion: suma((x) => x.inyeccion),
        descarga: suma((x) => x.descarga),
        presion: prom((x) => x.presion),
        temperatura: prom((x) => x.temperatura),
        volumenTanque: prom((x) => x.volumenTanque),        // es un porcentaje: se promedia, no se suma
        poderCalorifico: prom((x) => x.poderCalorifico),
        brazos: l.length,
        brazosEnAlarma: l.filter((x) => x.alarma).length,
        simulado: l.some((x) => x.simulado),
    };
}

/** Valor de un KPI GNL desde la lectura consolidada (misma regla que kpi-card-tcl de la web). `energiaAcumulada` es la suma
 *  de energiaPulsoGnl desde que se abrió el tablero (la lleva quien escucha el socket, como cada tarjeta en la web). */
export function valorKpiGnl(codigo: string, c: ConsolidadoGnl | null, energiaAcumulada = 0): KpiGnlVivo | null {
    const def = KPIS_GNL_VIVO[String(codigo || '').toUpperCase()];
    if (!def || !c) return null;
    const base = { unidad: def.unidad, subtitulo: def.subtitulo || SUBTITULO_CONSOLIDADO, simulado: c.simulado };
    const v = (x: number | null): KpiGnlVivo | null => (x === null ? null : { ...base, valor: x, estado: 'neutro' });
    switch (String(codigo).toUpperCase()) {
        case 'PTT_GNL_KPI_FLUJO': return v(c.flujo);
        case 'PTT_GNL_KPI_DESCARGA': return v(c.descarga);
        case 'PTT_GNL_KPI_INYECCION': return v(c.inyeccion);
        case 'PTT_GNL_KPI_BOG': return v(c.bog);
        case 'PTT_GNL_KPI_CALIDAD':
        case 'PTT_GNL_KPI_CALORIFICO': return v(c.poderCalorifico);
        case 'PTT_GNL_KPI_PRESION':
        case 'PTT_GNL_GAUGE_PRESION': return v(c.presion);
        case 'PTT_GNL_KPI_TEMP': return v(c.temperatura);
        case 'PTT_GNL_KPI_TNQ_OCUP': return v(c.volumenTanque);
        case 'PTT_GNL_KPI_VOLUMEN': return v(energiaPulsoGnl(c));
        case 'PTT_GNL_KPI_ODO_MMBTU': return v(Math.round(energiaAcumulada * 100) / 100);
        case 'PTT_GNL_KPI_ALERTAS':
            return {
                ...base, valor: c.brazosEnAlarma,
                subtitulo: `${c.brazosEnAlarma} de ${c.brazos} brazos en alarma`,
                estado: c.brazosEnAlarma > 0 ? 'critico' : 'ok',
            };
        default: return null;
    }
}

/** Mantiene el último pulso de cada brazo de un puerto; devuelve el consolidado. Pulsos de otro puerto se ignoran. */
export function aplicarPulsoGnl(estado: Map<string, LecturaGnl>, pulso: unknown, puerto: string): ConsolidadoGnl | null {
    const lista = Array.isArray(pulso) ? pulso
        : pulso && typeof pulso === 'object' && Array.isArray((pulso as any).brazos) ? (pulso as any).brazos.map((b: any) => ({ ...(pulso as any), ...b }))
            : [pulso];
    const objetivo = String(puerto || '').trim().toUpperCase();
    for (const p of lista) {
        if (!p || typeof p !== 'object') continue;
        const delPulso = String((p as any).id_puerto ?? (p as any).puerto ?? objetivo).trim().toUpperCase();
        if (objetivo && delPulso && delPulso !== objetivo) continue;
        const brazo = String((p as any).codigo_segmento ?? (p as any).brazo_id ?? (p as any).id_brazo ?? (p as any).segmento ?? (p as any).brazo ?? 'BRAZO-01').trim().toUpperCase();
        estado.set(brazo, normalizarPulsoGnl(p as Record<string, unknown>, estado.get(brazo)));
    }
    return consolidarGnl([...estado.values()]);
}
