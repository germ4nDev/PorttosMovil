/*
    Author: German Valencia
    Núcleo · rejilla de la app con el layout de la web (fase A 2026-10-25; reglas por dispositivo OT-008, 2026-10-29;
    alto de la web en ambos dispositivos CC-107, 2026-11-01)
    Pedido del usuario (2026-10-29): «en tableta debe respetar el mismo layout como está en la BD, tamaño y posición, igual
    para todas las pestañas; en el teléfono, al ser vertical, los widgets KPI deben salir 2 por fila y siempre arriba de la
    pantalla, los demás widgets deben salir 1 por fila».
    Pedido del usuario (2026-11-01): «las gráficas salen aplastadas, deben tener mínimo 2 de altura como en la web; mientras
    menos cambios bruscos haya entre plataformas, más cómodo va a estar con Porttos». Alto en el teléfono: «igual que la web».
      rejillaTableta(celdas)   12 columnas, celda por celda como en la BD, en MEDIAS filas (ALTO_MEDIA_FILA = 74 px con
                               12 px de separación: dos medias filas = una fila de la web de 160 px, ALTO_FILA_WEB y
                               SEPARACION_WEB de gridster). Un hueco de la BD es el mismo hueco de la web. Las filas de la BD
                               ocupadas solo por KPI miden media fila (usuario, 2026-11-01: «en la tableta los KPI deben ser la
                               mitad de la altura para que se vea armónico»): la franja de KPI queda a la mitad y lo de abajo
                               sube. Si un widget pide más filas que las de la BD (`minimo`, gráficas 2), crece y empuja hacia
                               abajo lo que tenga debajo, como gridster (pushItems hacia el sur).
      rejillaTelefono(celdas)  2 columnas de filas de 56 px (separación 10 px). Primero TODOS los KPI (`kpi: true`), de a 2
                               por fila, en orden de lectura; un KPI solo en su fila ocupa media fila. Después lo demás, 1 por
                               fila, con el alto que tiene en la web (filas de la BD en píxeles de la web, filasTelefono) y
                               al menos `minimo` filas de la web (gráficas 2) y ALTO_MINIMO_TELEFONO filas del teléfono.
      esKpi(w)                 KPI por su código (_KPI_) o por ser una tarjeta de un solo KPI: un KPI sin dato llega como
                               tarjeta «vacía» y sigue siendo KPI (antes salía a fila completa y debajo de lo demás).
    Ambas devuelven, por id, la posición en la rejilla CSS y el total de filas. Las celdas salen de la regla única de layout
    (PlataformaApiIA/utils/layout/layout-efectivo.js), que ya no deja celdas que se pisen.
*/

/** `kpi`: el widget es un KPI. `minimo`: filas de la web mínimas (gráficas: 2), en ambos dispositivos. */
export interface CeldaWeb { id: string; x: number; y: number; cols: number; rows: number; minimo?: number; kpi?: boolean; }
export interface PosicionRejilla { columna: number; ancho: number; fila: number; alto: number; }
export interface Rejilla { columnas: number; filas: number; posiciones: Record<string, PosicionRejilla>; }

/** Filas mínimas de un widget en el teléfono (filas de 56 px): el alto de un KPI. */
const ALTO_MINIMO_TELEFONO = 3;
export const COLUMNAS_WEB = 12;
/** Gridster de la web (pestana-gridster.base.ts): fixedRowHeight 160 px y margin 12 px. La tableta usa los mismos. */
export const ALTO_FILA_WEB = 160;
export const SEPARACION_WEB = 12;
/** Tableta: media fila de la web (2 × 74 + 12 = 160 px). La rejilla CSS de la tableta usa este alto (CC-108). */
export const ALTO_MEDIA_FILA = (ALTO_FILA_WEB - SEPARACION_WEB) / 2;
/** Rejilla del teléfono: filas de 56 px separadas 10 px (tablero.page.scss). */
export const ALTO_FILA_TELEFONO = 56;
export const SEPARACION_TELEFONO = 10;
/** Filas de la web mínimas de una gráfica (pedido del usuario, 2026-11-01). */
export const FILAS_MINIMAS_GRAFICA = 2;

const ordenLectura = (c: CeldaWeb[]) => [...(c || [])].filter(Boolean).sort((a, b) => a.y - b.y || a.x - b.x);

/** Alto en píxeles de `filas` filas de la web (las separaciones de adentro cuentan). */
export function altoWebPx(filas: number): number {
    const n = Math.max(1, filas || 1);
    return n * ALTO_FILA_WEB + (n - 1) * SEPARACION_WEB;
}

/** Filas del teléfono que dan el alto de `filasWeb` filas de la web (lo más cercano: 2 → 5 filas = 320 px; 3 → 8 = 518 px). */
export function filasTelefono(filasWeb: number): number {
    const paso = ALTO_FILA_TELEFONO + SEPARACION_TELEFONO;
    return Math.max(1, Math.round((altoWebPx(filasWeb) + SEPARACION_TELEFONO) / paso));
}

/** KPI por su código o por ser una tarjeta de un solo KPI; un panel con varios KPI no lo es (va a todo el ancho). */
export function esKpi(w: { tipo: string; id?: string; codigo?: string; items?: unknown[] } | null | undefined): boolean {
    if (!w) return false;
    if (w.tipo === 'kpis') return (w.items?.length ?? 0) <= 1;
    return /(^|_)KPI(_|$)/i.test(String(w.codigo ?? w.id ?? ''));
}

const chocan = (a: PosicionRejilla, b: PosicionRejilla) =>
    a.columna < b.columna + b.ancho && b.columna < a.columna + a.ancho && a.fila < b.fila + b.alto && b.fila < a.fila + a.alto;

/**
 * Medias filas de cada fila de la BD en la tableta: 1 si solo la ocupan KPI (franja de KPI a la mitad), 2 si no (también las
 * filas vacías: el hueco se conserva). Devuelve dónde empieza cada fila de la BD, en medias filas.
 */
function inicioMedias(lista: CeldaWeb[]): (y: number) => number {
    const fin = Math.max(0, ...lista.map((w) => Math.max(0, w.y) + Math.max(1, w.rows)));
    const inicio = [0];
    for (let k = 0; k < fin; k++) {
        const en = lista.filter((w) => Math.max(0, w.y) <= k && k < Math.max(0, w.y) + Math.max(1, w.rows));
        inicio.push(inicio[k] + (en.length && en.every((w) => w.kpi) ? 1 : 2));
    }
    return (y: number) => (y <= fin ? inicio[Math.max(0, y)] : inicio[fin] + 2 * (y - fin));
}

export function rejillaTableta(celdas: CeldaWeb[], columnas = COLUMNAS_WEB): Rejilla {
    const posiciones: Record<string, PosicionRejilla> = {};
    const puestas: PosicionRejilla[] = [];
    const lista = ordenLectura(celdas);
    const medias = inicioMedias(lista);
    let filas = 0;
    for (const w of lista) {
        const ancho = Math.max(1, Math.min(columnas, w.cols));
        const x = Math.max(0, Math.min(w.x, columnas - ancho));
        const y = Math.max(0, w.y);
        const enBD = medias(y + Math.max(1, w.rows)) - medias(y);
        const p = { columna: x + 1, ancho, fila: medias(y) + 1, alto: Math.max(enBD, 2 * (w.minimo ?? 0)) };
        // Como gridster: si un widget de arriba creció, este baja hasta quedar libre (sin la regla, es su lugar de la BD)
        while (puestas.some((q) => chocan(p, q))) p.fila++;
        posiciones[w.id] = p;
        puestas.push(p);
        filas = Math.max(filas, p.fila - 1 + p.alto);
    }
    return { columnas, filas, posiciones };
}

export function rejillaTelefono(celdas: CeldaWeb[]): Rejilla {
    const lista = ordenLectura(celdas);
    const kpis = lista.filter((c) => c.kpi);
    const resto = lista.filter((c) => !c.kpi);
    const posiciones: Record<string, PosicionRejilla> = {};
    let fila = 0;
    for (let i = 0; i < kpis.length; i += 2) {
        const par = kpis.slice(i, i + 2);
        par.forEach((c, j) => { posiciones[c.id] = { columna: j + 1, ancho: 1, fila: fila + 1, alto: ALTO_MINIMO_TELEFONO }; });
        fila += ALTO_MINIMO_TELEFONO;
    }
    for (const c of resto) {
        const alto = Math.max(ALTO_MINIMO_TELEFONO, filasTelefono(Math.max(c.rows, c.minimo ?? 0)));
        posiciones[c.id] = { columna: 1, ancho: 2, fila: fila + 1, alto };
        fila += alto;
    }
    return { columnas: 2, filas: fila, posiciones };
}
// export function rejillaTelefono(celdas: CeldaWeb[]): Rejilla {
//     const lista = ordenLectura(celdas);
//     const posiciones: Record<string, PosicionRejilla> = {};
//     let fila = 0;

//     // 🟢 NUEVO: Función auxiliar para detectar gráficas/tablas y forzar 5 filas de alto
//     const obtenerMinimo = (c: CeldaWeb) => {
//         if (c.minimo) return c.minimo;
//         const esGrafica = c.id.includes('CHRT') || c.id.includes('TAB'); // Ajusta según la nomenclatura de tus IDs
//         return esGrafica ? 5 : 0;
//     };

//     for (let i = 0; i < lista.length; i++) {
//         const a = lista[i];
//         const b = lista[i + 1];
//         if (a.cols <= ANCHO_ANGOSTO && b && b.cols <= ANCHO_ANGOSTO) {
//             // 🟢 Usamos la nueva función obtenerMinimo(a) y obtenerMinimo(b)
//             const alto = Math.max(ALTO_MINIMO_TELEFONO, a.rows, b.rows, obtenerMinimo(a), obtenerMinimo(b));
//             posiciones[a.id] = { columna: 1, ancho: 1, fila: fila + 1, alto };
//             posiciones[b.id] = { columna: 2, ancho: 1, fila: fila + 1, alto };
//             fila += alto;
//             i++;
//         } else {
//             // 🟢 Usamos la nueva función obtenerMinimo(a)
//             const alto = Math.max(ALTO_MINIMO_TELEFONO, a.rows, obtenerMinimo(a));
//             posiciones[a.id] = { columna: 1, ancho: 2, fila: fila + 1, alto };
//             fila += alto;
//         }
//     }
//     return { columnas: 2, filas: fila, posiciones };
// }

/** Estilo CSS de una celda: grid-column y grid-row. */
export function estiloCelda(p: PosicionRejilla | undefined): string {
    return p ? `grid-column: ${p.columna} / span ${p.ancho}; grid-row: ${p.fila} / span ${p.alto}` : '';
}
