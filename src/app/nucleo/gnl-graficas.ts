/*
    Author: German Valencia
    núcleo (nucleo/) · Gráficas de GNL iguales a la web (OT-005, fase B2, 2026-10-25)
    Pedido del usuario: «el histórico, el tacómetro y la gráfica de temperatura deben ser iguales en la app en todo sentido».
    Lógica copiada de los componentes de la web (PlataformaIA/src/app/porttos/widgets/panel-gnl/), pura y con prueba de paridad
    (movil-core lee el .ts de la web y compara umbrales, colores y tamaños):
      gnl-gauge-widget            colorGaugeGnl, geometriaGaugeGnl
      gnl-flujo-chart             ventana en vivo de 60 puntos cada 2 s, autoZoom 5 %, armarHistorialGnl (vista ampliada)
      gnl-temp-sparkline-widget   ventana de 60 puntos con «anti-rampa», autoZoom 15 %, límite operativo −150 °C
      gnl-state.service           lecturaGnlDeBrazo (filtro por brazo; «TODOS» = consolidado)
*/
import { ConsolidadoGnl, LecturaGnl, consolidarGnl } from './gnl';

// ------------------------------------------------------------------ tacómetro (gnl-gauge-widget)

/** Semáforo del tacómetro: rojo con alarma o ≥ 75 psi, naranja de 72 a 75, azul criogénico normal. */
export const GAUGE_GNL = Object.freeze({
    min: 0, max: 100, longitudArco: 110, umbralPeligro: 75, umbralAdvertencia: 72,
    colorPeligro: '#ff4757', colorAdvertencia: '#ff9800', colorNormal: '#00d4ff',
});

export function colorGaugeGnl(presion: number, alarma: boolean): string {
    if (alarma || presion >= GAUGE_GNL.umbralPeligro) return GAUGE_GNL.colorPeligro;
    if (presion >= GAUGE_GNL.umbralAdvertencia && presion < GAUGE_GNL.umbralPeligro) return GAUGE_GNL.colorAdvertencia;
    return GAUGE_GNL.colorNormal;
}

/** Ángulo de la aguja (−90° a +90°) y trazo del arco (stroke-dasharray sobre 110 px) para una presión de 0 a 100 psi. */
export function geometriaGaugeGnl(presion: number): { angulo: number; dashArray: string } {
    const { min, max, longitudArco } = GAUGE_GNL;
    const v = Number.isFinite(presion) ? presion : 0;
    const porcentaje = (Math.min(Math.max(v, min), max) - min) / (max - min);
    return { angulo: -90 + porcentaje * 180, dashArray: `${longitudArco * porcentaje}, 999` };
}

// ------------------------------------------------------------------ ventanas en vivo (flujo y temperatura)

/** Puntos de la ventana en vivo y paso del motor gráfico del flujo (60 × 2 s = 2 minutos), como la web. */
export const VENTANA_GNL = Object.freeze({ puntos: 60, pasoMs: 2000 });
/** Límite operativo que muestra la tarjeta de temperatura de la web. */
export const LIMITE_OPERATIVO_TEMP_GNL = -150;

export interface VentanaGnl { labels: string[]; valores: number[]; }

const dos = (v: number) => Number(Number(v).toFixed(2));

/** Primer pulso: la web pre-llena la ventana con el mismo valor hacia atrás (cada 2 s) para no arrancar vacía. */
export function prellenarVentanaGnl(valor: number, ahora: Date, hora: (d: Date) => string, puntos = VENTANA_GNL.puntos): VentanaGnl {
    const labels: string[] = [];
    const valores: number[] = [];
    for (let i = puntos; i > 0; i--) {
        labels.push(hora(new Date(ahora.getTime() - i * VENTANA_GNL.pasoMs)));
        valores.push(dos(valor));
    }
    return { labels, valores };
}

/** Agrega un punto y descarta el más viejo. Con `antiRampa`, un punto con la misma etiqueta reemplaza la punta (temperatura). */
export function empujarVentanaGnl(v: VentanaGnl, etiqueta: string, valor: number, antiRampa = false, puntos = VENTANA_GNL.puntos): VentanaGnl {
    const labels = [...v.labels];
    const valores = [...v.valores];
    if (antiRampa && labels.length && labels[labels.length - 1] === etiqueta) valores[valores.length - 1] = dos(valor);
    else { labels.push(etiqueta); valores.push(dos(valor)); }
    while (labels.length > puntos) { labels.shift(); valores.shift(); }
    return { labels, valores };
}

/** Auto-zoom del eje y: flujo 5 % de margen (1 si es plano); temperatura 15 % del rango absoluto (0,5 si es plano). */
export function autoZoomGnl(valores: number[], tipo: 'flujo' | 'temperatura'): { min: number; max: number } | null {
    if (valores.length <= 1) return null;
    const minData = Math.min(...valores);
    const maxData = Math.max(...valores);
    const margen = tipo === 'flujo' ? (maxData - minData) * 0.05 : Math.abs(maxData - minData) * 0.15;
    const seguro = margen === 0 ? (tipo === 'flujo' ? 1 : 0.5) : margen;
    return { min: minData - seguro, max: maxData + seguro };
}

// ------------------------------------------------------------------ filtro por brazo (gnl-state.service)

export interface LecturaVistaGnl {
    brazo: string;            // 'TODOS' o el código del brazo, como la insignia de la web
    flujo: number | null;
    presion: number | null;
    temperatura: number | null;
    alarma: boolean;
    timestamp: string;
    simulado: boolean;
}

/** Lectura que ven las gráficas: el consolidado con «TODOS» o el último pulso del brazo elegido (null si no hay). */
export function lecturaGnlDeBrazo(estado: Map<string, LecturaGnl>, brazo: string): LecturaVistaGnl | null {
    const b = String(brazo || 'TODOS').trim().toUpperCase();
    if (b === 'TODOS') {
        const c: ConsolidadoGnl | null = consolidarGnl([...estado.values()]);
        return c ? { brazo: 'TODOS', flujo: c.flujo, presion: c.presion, temperatura: c.temperatura, alarma: c.brazosEnAlarma > 0, timestamp: c.timestamp, simulado: c.simulado } : null;
    }
    const l = estado.get(b);
    return l ? { brazo: l.brazo, flujo: l.flujo, presion: l.presion, temperatura: l.temperatura, alarma: l.alarma, timestamp: l.timestamp, simulado: l.simulado } : null;
}

/** Brazos con pulso, ordenados por su número (BRAZO-2 antes que BRAZO-10), como el selector de la web. */
export function brazosGnl(estado: Map<string, LecturaGnl>): string[] {
    const n = (s: string) => parseInt(s.replace(/\D+/g, ''), 10);
    return [...estado.keys()].sort((a, b) => (Number.isFinite(n(a)) && Number.isFinite(n(b)) ? n(a) - n(b) : a.localeCompare(b)));
}

// ------------------------------------------------------------------ historial por hora (vista ampliada del flujo)

export interface HistorialGnl {
    labels: string[]; volumenM3: number[]; energiaMmbtu: number[]; presionPsi: Array<number | null>; temperaturaC: Array<number | null>;
    alarmas: number[]; porBrazo: Array<{ brazo: string; volumenM3: number[]; total: number }>; filas: number; horas: number;
    simulado: boolean; fuente: string;
}

export interface VistaHistorialGnl {
    series: { label: string; data: number[] }[];
    resumen: { volumen: number; energia: number; presion: number | null; alarmas: number };
    filasBrazos: { brazo: string; volumenM3: number; energiaMmbtu: number; participacion: number; horasConFlujo: number }[];
    nota: string | null;
}

/** Rangos de horas del historial (rango-tcl de la web). */
export const RANGOS_HISTORIAL_GNL = [24, 72, 168] as const;

/** Misma regla que armarHistorial de gnl-flujo-chart: volumen apilado por brazo (si hay más de uno), resumen y tabla por brazo. */
export function armarHistorialGnl(h: HistorialGnl): VistaHistorialGnl {
    const suma = (xs: Array<number | null>) => (xs || []).reduce<number>((a, v) => a + (Number(v) || 0), 0);
    const brazos = h.porBrazo || [];
    const volumen = suma(h.volumenM3 || []);
    const presiones = (h.presionPsi || []).filter((v): v is number => v !== null && v !== undefined);
    return {
        series: brazos.length > 1 ? brazos.map((b) => ({ label: b.brazo, data: b.volumenM3 })) : [{ label: 'COMMON.VOLUME', data: h.volumenM3 || [] }],
        resumen: {
            volumen,
            energia: suma(h.energiaMmbtu || []),
            presion: presiones.length ? presiones.reduce((a, v) => a + v, 0) / presiones.length : null,
            alarmas: suma(h.alarmas || []),
        },
        filasBrazos: brazos.map((b) => ({
            brazo: b.brazo,
            volumenM3: b.total,
            energiaMmbtu: b.total * 22.4, // misma regla del consolidado (MMBTU_POR_M3)
            participacion: volumen > 0 ? Math.round((b.total / volumen) * 1000) / 10 : 0,
            horasConFlujo: (b.volumenM3 || []).filter((v) => Number(v) > 0).length,
        })),
        nota: h.filas
            ? null
            : 'Sin consolidados en el periodo. El historial se arma con los consolidados de 5 minutos desde que se activó; la gráfica en vivo de arriba sigue mostrando el SCADA.',
    };
}
