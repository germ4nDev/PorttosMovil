/*
    Author: German Valencia
    Genera src/assets/fondos/fondo-puerto.svg: fondo del ingreso de la app (ilustración propia, sin licencias de terceros).
    Puerto de contenedores de noche: cielo con luna y estrellas, bruma anaranjada en el horizonte, cerros y ciudad lejana,
    buque portacontenedores atracado, cuatro grúas pórtico STS con celosía, luces de aviso y reflectores con halo suave,
    muelle con postes de luz y agua con los reflejos de cada luz y un remolcador.
    Composición pensada para el teléfono en vertical (se ve toda la altura; el panel de ingreso tapa el centro):
    arriba (y < 520) el cielo y las plumas de las grúas; abajo (y > 1300) el agua, los reflejos y el remolcador.
    Uso (desde PorttosMovil): node herramientas/generar-fondo-puerto.js  → escribe src/assets/fondos/fondo-puerto.svg
    Reemplaza a generar-fondo-puerto.py (en este PC no hay Python; el .py está en _respaldos/2026-10-25_ingreso-centrado-fondo).
*/
const fs = require('fs');
const path = require('path');

// Aleatorio con semilla fija (mulberry32): el SVG sale igual en cada corrida
let semilla = 20261025;
const azar = () => {
    semilla |= 0; semilla = (semilla + 0x6D2B79F5) | 0;
    let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + azar() * (b - a);
const elegir = (xs) => xs[Math.floor(azar() * xs.length)];
const r1 = (v) => Math.round(v * 10) / 10;

const W = 1200, H = 1800;
const MUELLE = 880;          // borde del muelle (y)
const AGUA = MUELLE + 30;    // comienza el agua
const s = [];                // salida
const luces = [];            // fuentes de luz que se reflejan en el agua: { x, color, fuerza, ancho }

// ------------------------------------------------------------------ definiciones
s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">`);
s.push(`<defs>
<linearGradient id="cielo" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#01040b"/><stop offset=".30" stop-color="#061631"/><stop offset=".62" stop-color="#11305a"/>
  <stop offset=".82" stop-color="#2f4a72"/><stop offset=".93" stop-color="#7a5c6c"/><stop offset="1" stop-color="#d9844a"/>
</linearGradient>
<radialGradient id="bruma" cx=".5" cy="1" r=".75"><stop offset="0" stop-color="#ff9a4d" stop-opacity=".55"/><stop offset=".5" stop-color="#ff8a3c" stop-opacity=".16"/><stop offset="1" stop-color="#ff8a3c" stop-opacity="0"/></radialGradient>
<radialGradient id="halo-luna"><stop offset="0" stop-color="#fff6dc" stop-opacity=".55"/><stop offset=".25" stop-color="#cfe0ff" stop-opacity=".18"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></radialGradient>
<radialGradient id="luna" cx=".42" cy=".4" r=".65"><stop offset="0" stop-color="#fffaf0"/><stop offset=".75" stop-color="#efe6cf"/><stop offset="1" stop-color="#d8cdb2"/></radialGradient>
<radialGradient id="g-ambar"><stop offset="0" stop-color="#ffe2a8" stop-opacity=".95"/><stop offset=".18" stop-color="#ffc56b" stop-opacity=".45"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient>
<radialGradient id="g-blanca"><stop offset="0" stop-color="#ffffff" stop-opacity=".95"/><stop offset=".2" stop-color="#e4f0ff" stop-opacity=".40"/><stop offset="1" stop-color="#cfe2ff" stop-opacity="0"/></radialGradient>
<radialGradient id="g-roja"><stop offset="0" stop-color="#ff6b5e" stop-opacity="1"/><stop offset=".25" stop-color="#ff3b30" stop-opacity=".45"/><stop offset="1" stop-color="#ff3b30" stop-opacity="0"/></radialGradient>
<radialGradient id="g-verde"><stop offset="0" stop-color="#7dffb0" stop-opacity="1"/><stop offset=".25" stop-color="#2bd47a" stop-opacity=".4"/><stop offset="1" stop-color="#2bd47a" stop-opacity="0"/></radialGradient>
<linearGradient id="cono" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1d0" stop-opacity=".30"/><stop offset=".55" stop-color="#ffe2a8" stop-opacity=".10"/><stop offset="1" stop-color="#ffe2a8" stop-opacity="0"/></linearGradient>
<linearGradient id="mar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14304f"/><stop offset=".25" stop-color="#0b1f38"/><stop offset=".7" stop-color="#050f1e"/><stop offset="1" stop-color="#02060d"/></linearGradient>
<linearGradient id="casco" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14243a"/><stop offset="1" stop-color="#070e19"/></linearGradient>
<radialGradient id="nube"><stop offset="0" stop-color="#b8c9e6" stop-opacity=".16"/><stop offset="1" stop-color="#b8c9e6" stop-opacity="0"/></radialGradient>
<radialGradient id="col-calida"><stop offset="0" stop-color="#ffd59a" stop-opacity=".30"/><stop offset=".45" stop-color="#ffd59a" stop-opacity="0.10"/><stop offset="1" stop-color="#ffd59a" stop-opacity="0"/></radialGradient>
<radialGradient id="col-fria"><stop offset="0" stop-color="#e8f1ff" stop-opacity=".26"/><stop offset=".45" stop-color="#e8f1ff" stop-opacity="0.09"/><stop offset="1" stop-color="#e8f1ff" stop-opacity="0"/></radialGradient>
<radialGradient id="col-roja"><stop offset="0" stop-color="#ff5a4e" stop-opacity=".22"/><stop offset=".45" stop-color="#ff5a4e" stop-opacity="0.07"/><stop offset="1" stop-color="#ff5a4e" stop-opacity="0"/></radialGradient>
<radialGradient id="col-verde"><stop offset="0" stop-color="#5dffa0" stop-opacity=".22"/><stop offset=".45" stop-color="#5dffa0" stop-opacity="0.07"/><stop offset="1" stop-color="#5dffa0" stop-opacity="0"/></radialGradient>
<clipPath id="agua"><rect y="${AGUA}" width="${W}" height="${H - AGUA}"/></clipPath>
<linearGradient id="niebla" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4d6" stop-opacity="0"/><stop offset=".5" stop-color="#9fb4d6" stop-opacity=".10"/><stop offset="1" stop-color="#9fb4d6" stop-opacity="0"/></linearGradient>
</defs>`);

// ------------------------------------------------------------------ cielo
s.push(`<rect width="${W}" height="${MUELLE}" fill="url(#cielo)"/>`);
s.push(`<rect x="-200" y="${MUELLE - 420}" width="${W + 400}" height="440" fill="url(#bruma)"/>`);
// estrellas: muchas pequeñas, algunas brillantes con destello
for (let i = 0; i < 170; i++) {
    const x = entre(0, W), y = Math.pow(azar(), 1.6) * 640, r = elegir([.6, .8, .9, 1.1, 1.3]);
    const op = r1(entre(.25, .9) * (1 - y / 900));
    s.push(`<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${elegir(['#dfe9ff', '#ffffff', '#ffeccc'])}" opacity="${op}"/>`);
}
for (let i = 0; i < 9; i++) {
    const x = entre(150, 1050), y = entre(30, 420);
    s.push(`<g opacity="${r1(entre(.5, .85))}"><circle cx="${r1(x)}" cy="${r1(y)}" r="1.8" fill="#fff"/>` +
        `<path d="M${r1(x - 7)} ${r1(y)}H${r1(x + 7)}M${r1(x)} ${r1(y - 7)}V${r1(y + 7)}" stroke="#dfe9ff" stroke-width=".7" opacity=".7"/></g>`);
}
// luna con halo
const LX = 860, LY = 190;
s.push(`<circle cx="${LX}" cy="${LY}" r="190" fill="url(#halo-luna)"/>`);
s.push(`<circle cx="${LX}" cy="${LY}" r="36" fill="url(#luna)"/>`);
s.push(`<g fill="#cbbf9f" opacity=".35"><circle cx="${LX - 10}" cy="${LY - 8}" r="7"/><circle cx="${LX + 12}" cy="${LY + 10}" r="5"/><circle cx="${LX + 4}" cy="${LY - 18}" r="3.5"/></g>`);
luces.push({ x: LX, color: '#fff3d6', fuerza: .6, ancho: 60 });
// velos de nube muy suaves (degradado radial, sin bordes)
for (const [cx, cy, rx] of [[760, 250, 300], [330, 380, 340]]) {
    s.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${r1(rx * .12)}" fill="url(#nube)"/>`);
}

// ------------------------------------------------------------------ cerros y ciudad lejana
s.push(`<path d="M0 ${MUELLE - 120} C150 ${MUELLE - 170} 260 ${MUELLE - 150} 380 ${MUELLE - 175} S640 ${MUELLE - 140} 780 ${MUELLE - 160} S1050 ${MUELLE - 190} 1200 ${MUELLE - 150} V${MUELLE} H0Z" fill="#0d1a2e" opacity=".9"/>`);
let x = 0;
while (x < W) {
    const w = entre(16, 44), h = entre(14, 80), y0 = MUELLE - 110 - h;
    s.push(`<rect x="${r1(x)}" y="${r1(y0)}" width="${r1(w)}" height="${r1(h + 110)}" fill="#0f2036"/>`);
    // ventanas encendidas
    for (let k = 0; k < Math.floor(h / 10); k++) {
        if (azar() < .35) s.push(`<rect x="${r1(x + entre(3, w - 6))}" y="${r1(y0 + 5 + k * 10)}" width="2.4" height="2.4" fill="${elegir(['#ffd28a', '#ffe6b8', '#9fd0ff'])}" opacity="${r1(entre(.35, .8))}"/>`);
    }
    x += w + entre(0, 5);
}
s.push(`<rect y="${MUELLE - 200}" width="${W}" height="200" fill="url(#niebla)"/>`);

// ------------------------------------------------------------------ buque portacontenedores atracado (detrás de las grúas)
const B0 = 90, B1 = 1130, BY = MUELLE - 30;   // cubierta principal
s.push(`<path d="M${B0} ${BY - 60} L${B1 - 30} ${BY - 60} Q${B1 + 30} ${BY - 50} ${B1 + 10} ${BY + 10} L${B1 - 40} ${BY + 50} L${B0 + 40} ${BY + 50} Q${B0 - 10} ${BY + 10} ${B0} ${BY - 60} Z" fill="url(#casco)"/>`);
s.push(`<rect x="${B0 + 6}" y="${BY - 60}" width="${B1 - B0 - 40}" height="5" fill="#a8473a" opacity=".85"/>`);
s.push(`<path d="M${B0 + 30} ${BY + 26} H${B1 - 50}" stroke="#2c4a6b" stroke-width="2" opacity=".5"/>`);
// contenedores en cubierta, por bahías, con luz de luna en la cara superior
const COLORES = ['#b4572b', '#2c66a8', '#36786a', '#7d838c', '#9c3d2c', '#c48f2a', '#244b78', '#56636f', '#8a2f45', '#3d8f8f'];
const CW = 30, CH = 17;
for (let bx = B0 + 40; bx < B1 - 210; bx += CW * 2 + 6) {
    const pisos = Math.floor(entre(3, 8));
    for (let col = 0; col < 2; col++) {
        for (let k = 0; k < pisos - (col && azar() < .4 ? 1 : 0); k++) {
            const c = elegir(COLORES), cx = bx + col * CW, cy = BY - 60 - (k + 1) * CH;
            s.push(`<rect x="${cx}" y="${cy}" width="${CW - 1}" height="${CH - 1}" fill="${c}" opacity=".78"/>`);
            s.push(`<rect x="${cx}" y="${cy}" width="${CW - 1}" height="2" fill="#ffffff" opacity=".10"/>`);
        }
    }
}
// superestructura (puente) con ventanas iluminadas, chimenea y luces de tope
const PX = B1 - 190;
s.push(`<rect x="${PX}" y="${BY - 260}" width="96" height="200" fill="#16273f"/>`);
s.push(`<rect x="${PX - 18}" y="${BY - 270}" width="132" height="14" fill="#1d3352"/>`);
for (let fy = BY - 245; fy < BY - 75; fy += 22) {
    for (let fx = PX + 8; fx < PX + 88; fx += 14) if (azar() < .7) s.push(`<rect x="${fx}" y="${fy}" width="9" height="7" fill="#ffd9a0" opacity="${r1(entre(.45, .9))}"/>`);
}
s.push(`<rect x="${PX + 112}" y="${BY - 230}" width="30" height="80" fill="#13233a"/><rect x="${PX + 112}" y="${BY - 230}" width="30" height="10" fill="#a8473a"/>`);
s.push(`<path d="M${PX + 48} ${BY - 270} V${BY - 330}" stroke="#16273f" stroke-width="3"/>`);
s.push(`<circle cx="${PX + 48}" cy="${BY - 332}" r="14" fill="url(#g-blanca)"/><circle cx="${PX + 48}" cy="${BY - 332}" r="2.2" fill="#fff"/>`);
s.push(`<circle cx="${B1 - 6}" cy="${BY - 70}" r="16" fill="url(#g-verde)"/><circle cx="${B1 - 6}" cy="${BY - 70}" r="2.4" fill="#9dffc4"/>`);
luces.push({ x: PX + 48, color: '#ffe6b8', fuerza: .35, ancho: 40 }, { x: B1 - 6, color: '#5dffa0', fuerza: .35, ancho: 14 });

// ------------------------------------------------------------------ grúas pórtico STS
const ACERO = '#0b1729', BORDE = '#29486c';
function grua(cx, esc, trolley) {
    const e = esc, base = MUELLE + 6;
    const piernaX = [cx - 70 * e, cx + 70 * e];
    const portal = base - 300 * e;          // viga del pórtico
    const pluma = base - 430 * e;           // viga de la pluma
    const apice = base - 600 * e;           // vértice del marco A
    const punta = cx - 470 * e;             // punta de la pluma sobre el agua
    const cola = cx + 230 * e;              // contrapluma (backreach)
    const g = [];
    g.push(`<g>`);
    // piernas y diagonales del pórtico
    for (const px of piernaX) g.push(`<rect x="${r1(px - 8 * e)}" y="${r1(portal)}" width="${r1(16 * e)}" height="${r1(base - portal)}" fill="${ACERO}"/>`);
    g.push(`<path d="M${r1(piernaX[0])} ${r1(portal + 10 * e)} L${r1(piernaX[1])} ${r1(base - 120 * e)} M${r1(piernaX[1])} ${r1(portal + 10 * e)} L${r1(piernaX[0])} ${r1(base - 120 * e)}" stroke="${ACERO}" stroke-width="${r1(5 * e)}"/>`);
    g.push(`<rect x="${r1(piernaX[0] - 20 * e)}" y="${r1(portal - 14 * e)}" width="${r1(180 * e)}" height="${r1(20 * e)}" fill="${ACERO}"/>`);
    g.push(`<rect x="${r1(piernaX[0] - 26 * e)}" y="${r1(base - 14 * e)}" width="${r1(52 * e)}" height="${r1(14 * e)}" fill="${ACERO}"/><rect x="${r1(piernaX[1] - 26 * e)}" y="${r1(base - 14 * e)}" width="${r1(52 * e)}" height="${r1(14 * e)}" fill="${ACERO}"/>`);
    // columnas superiores hasta la pluma
    for (const px of piernaX) g.push(`<rect x="${r1(px - 6 * e)}" y="${r1(pluma)}" width="${r1(12 * e)}" height="${r1(portal - pluma)}" fill="${ACERO}"/>`);
    // pluma con celosía (cordón superior, inferior y diagonales)
    const alto = 26 * e;
    g.push(`<rect x="${r1(punta)}" y="${r1(pluma)}" width="${r1(cola - punta)}" height="${r1(5 * e)}" fill="${ACERO}"/>`);
    g.push(`<rect x="${r1(punta)}" y="${r1(pluma + alto)}" width="${r1(cola - punta)}" height="${r1(5 * e)}" fill="${ACERO}"/>`);
    let zig = `M${r1(punta)} ${r1(pluma + alto)}`;
    for (let zx = punta, arriba = true; zx < cola; zx += 26 * e, arriba = !arriba) zig += ` L${r1(zx + 26 * e)} ${r1(arriba ? pluma : pluma + alto)}`;
    g.push(`<path d="${zig}" fill="none" stroke="${ACERO}" stroke-width="${r1(2.4 * e)}"/>`);
    g.push(`<path d="M${r1(punta)} ${r1(pluma)} H${r1(cola)}" stroke="${BORDE}" stroke-width="${r1(1.2 * e)}" opacity=".7"/>`);
    // marco A y tirantes
    g.push(`<path d="M${r1(cx - 40 * e)} ${r1(pluma)} L${r1(cx)} ${r1(apice)} L${r1(cx + 60 * e)} ${r1(pluma)}" fill="none" stroke="${ACERO}" stroke-width="${r1(10 * e)}" stroke-linejoin="round"/>`);
    g.push(`<path d="M${r1(cx)} ${r1(apice)} L${r1(punta + 10 * e)} ${r1(pluma)} M${r1(cx)} ${r1(apice)} L${r1(punta + 160 * e)} ${r1(pluma)} M${r1(cx)} ${r1(apice)} L${r1(cola - 10 * e)} ${r1(pluma)}" stroke="${ACERO}" stroke-width="${r1(3 * e)}"/>`);
    g.push(`<path d="M${r1(cx)} ${r1(apice)} L${r1(punta + 10 * e)} ${r1(pluma)}" stroke="${BORDE}" stroke-width="${r1(1 * e)}" opacity=".6"/>`);
    // sala de máquinas sobre la contrapluma
    g.push(`<rect x="${r1(cx + 70 * e)}" y="${r1(pluma - 42 * e)}" width="${r1(150 * e)}" height="${r1(42 * e)}" fill="#122440"/>`);
    g.push(`<rect x="${r1(cx + 70 * e)}" y="${r1(pluma - 42 * e)}" width="${r1(150 * e)}" height="${r1(3 * e)}" fill="${BORDE}" opacity=".7"/>`);
    // carro, cabina iluminada y cables con el spreader y un contenedor
    const tx = trolley;
    g.push(`<rect x="${r1(tx - 22 * e)}" y="${r1(pluma + alto + 5 * e)}" width="${r1(44 * e)}" height="${r1(10 * e)}" fill="#14273f"/>`);
    g.push(`<rect x="${r1(tx - 14 * e)}" y="${r1(pluma + alto + 15 * e)}" width="${r1(26 * e)}" height="${r1(20 * e)}" fill="#1b3556"/>`);
    g.push(`<rect x="${r1(tx - 11 * e)}" y="${r1(pluma + alto + 19 * e)}" width="${r1(20 * e)}" height="${r1(9 * e)}" fill="#ffd9a0" opacity=".85"/>`);
    const cuelga = pluma + alto + entre(140, 260) * e;
    g.push(`<path d="M${r1(tx - 8 * e)} ${r1(pluma + alto + 35 * e)} V${r1(cuelga)} M${r1(tx + 8 * e)} ${r1(pluma + alto + 35 * e)} V${r1(cuelga)}" stroke="#2a4466" stroke-width="${r1(1.2 * e)}"/>`);
    g.push(`<rect x="${r1(tx - 34 * e)}" y="${r1(cuelga)}" width="${r1(68 * e)}" height="${r1(5 * e)}" fill="#0f1f35"/>`);
    g.push(`<rect x="${r1(tx - 32 * e)}" y="${r1(cuelga + 5 * e)}" width="${r1(64 * e)}" height="${r1(26 * e)}" fill="${elegir(COLORES)}" opacity=".9"/>`);
    // reflectores bajo la pluma: halo suave y cono de luz que se desvanece (sin bordes duros)
    for (const fx of [punta + 60 * e, cx - 150 * e, cx + 10 * e]) {
        const fy = pluma + alto + 6 * e;
        g.push(`<path d="M${r1(fx - 5 * e)} ${r1(fy)} L${r1(fx - 70 * e)} ${r1(base + 40)} L${r1(fx + 70 * e)} ${r1(base + 40)} L${r1(fx + 5 * e)} ${r1(fy)} Z" fill="url(#cono)" opacity=".55"/>`);
        g.push(`<circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(30 * e)}" fill="url(#g-blanca)"/><circle cx="${r1(fx)}" cy="${r1(fy)}" r="${r1(2.6 * e)}" fill="#fff"/>`);
        luces.push({ x: fx, color: '#fff1d6', fuerza: .55, ancho: 22 });
    }
    // luces de aviso: roja en el vértice, ámbar en la punta de la pluma
    g.push(`<circle cx="${r1(cx)}" cy="${r1(apice - 6 * e)}" r="${r1(26 * e)}" fill="url(#g-roja)"/><circle cx="${r1(cx)}" cy="${r1(apice - 6 * e)}" r="${r1(3 * e)}" fill="#ff8a7d"/>`);
    g.push(`<circle cx="${r1(punta + 4 * e)}" cy="${r1(pluma + 2 * e)}" r="${r1(22 * e)}" fill="url(#g-ambar)"/><circle cx="${r1(punta + 4 * e)}" cy="${r1(pluma + 2 * e)}" r="${r1(2.6 * e)}" fill="#ffe2a8"/>`);
    luces.push({ x: cx, color: '#ff5a4e', fuerza: .35, ancho: 10 }, { x: punta + 4 * e, color: '#ffc56b', fuerza: .4, ancho: 12 });
    g.push(`</g>`);
    return g.join('');
}
// tres grúas espaciadas dentro del ancho que se ve en el teléfono (x ≈ 185–1015); la del centro, más cerca
s.push(grua(1010, .92, 820));
s.push(grua(380, .95, 200));
s.push(grua(700, 1.06, 470));

// ------------------------------------------------------------------ muelle con postes de luz
s.push(`<rect y="${MUELLE}" width="${W}" height="${AGUA - MUELLE}" fill="#08111e"/>`);
s.push(`<rect y="${MUELLE}" width="${W}" height="2" fill="#3a5b82" opacity=".6"/>`);
for (let px = 40; px < W; px += 120) {
    s.push(`<path d="M${px} ${MUELLE} V${MUELLE - 70} h12" stroke="#0e1c30" stroke-width="3" fill="none"/>`);
    s.push(`<circle cx="${px + 12}" cy="${MUELLE - 68}" r="26" fill="url(#g-ambar)"/><circle cx="${px + 12}" cy="${MUELLE - 68}" r="2.4" fill="#ffe2a8"/>`);
    luces.push({ x: px + 12, color: '#ffc56b', fuerza: .45, ancho: 16 });
}
for (let bx = 20; bx < W; bx += 46) s.push(`<rect x="${bx}" y="${MUELLE + 12}" width="22" height="6" rx="2" fill="#0f1f34"/>`);

// ------------------------------------------------------------------ agua: degradado, reflejos de cada luz y oleaje
s.push(`<rect y="${AGUA}" width="${W}" height="${H - AGUA}" fill="url(#mar)"/>`);
// reflejo de la silueta del muelle y las grúas (franja oscura bajo el muelle)
s.push(`<rect y="${AGUA}" width="${W}" height="60" fill="#04090f" opacity=".45"/>`);
// Cada luz deja una columna de brillo que se desvanece hacia abajo y unos pocos destellos cortos que se abren con la distancia
const columna = (c) => (c === '#ff5a4e' ? 'col-roja' : c === '#5dffa0' ? 'col-verde' : c === '#fff1d6' || c === '#fff3d6' ? 'col-fria' : 'col-calida');
for (const l of luces) {
    const largo = 260 + l.fuerza * 760;
    s.push(`<ellipse cx="${r1(l.x)}" cy="${AGUA}" rx="${r1(l.ancho * 1.1)}" ry="${r1(largo)}" fill="url(#${columna(l.color)})" opacity="${r1(l.fuerza * 1.3 * 10) / 10}" clip-path="url(#agua)"/>`);
    for (let y = AGUA + 10; y < AGUA + largo * .85; y += entre(14, 30)) {
        const avance = (y - AGUA) / largo;
        const w = l.ancho * entre(.35, 1.1) * (1 + avance);
        const op = r1(Math.max(0, l.fuerza * .8 * (1 - avance) * entre(.5, 1)) * 100) / 100;
        if (op < .04) continue;
        const ox = l.x + entre(-4, 4) * (1 + avance * 3);
        s.push(`<rect x="${r1(ox - w / 2)}" y="${r1(y)}" width="${r1(w)}" height="2" rx="1" fill="${l.color}" opacity="${op}"/>`);
    }
}
for (let i = 0; i < 110; i++) {
    const y = entre(AGUA + 20, H - 20), w = entre(30, 140), op = r1(entre(.03, .09) * (1 - (y - AGUA) / (H - AGUA) * .6) * 100) / 100;
    s.push(`<rect x="${r1(entre(-40, W))}" y="${r1(y)}" width="${r1(w)}" height="1.2" rx=".6" fill="${elegir(['#5f8fc4', '#8fb3dd'])}" opacity="${op}"/>`);
}

// ------------------------------------------------------------------ remolcador con estela (en la parte baja, la que se ve bajo el panel)
const RX = 420, RY = 1560;
s.push(`<path d="M${RX - 330} ${RY + 14} Q${RX - 160} ${RY + 2} ${RX - 70} ${RY + 10}" stroke="#bcd3f0" stroke-width="2" fill="none" opacity=".18"/>`);
s.push(`<path d="M${RX - 280} ${RY + 24} Q${RX - 150} ${RY + 16} ${RX - 70} ${RY + 18}" stroke="#bcd3f0" stroke-width="1.5" fill="none" opacity=".12"/>`);
s.push(`<path d="M${RX - 80} ${RY} L${RX + 90} ${RY} Q${RX + 120} ${RY + 4} ${RX + 104} ${RY + 22} L${RX - 64} ${RY + 22} Z" fill="#0b1626"/>`);
s.push(`<rect x="${RX - 70}" y="${RY - 4}" width="166" height="4" fill="#a8473a" opacity=".85"/>`);
s.push(`<rect x="${RX - 20}" y="${RY - 34}" width="60" height="30" fill="#132840"/><rect x="${RX - 6}" y="${RY - 54}" width="34" height="20" fill="#18304d"/>`);
s.push(`<rect x="${RX - 2}" y="${RY - 49}" width="26" height="7" fill="#ffd9a0" opacity=".8"/><rect x="${RX - 14}" y="${RY - 26}" width="48" height="6" fill="#ffd9a0" opacity=".55"/>`);
s.push(`<path d="M${RX + 11} ${RY - 54} V${RY - 82}" stroke="#18304d" stroke-width="2.5"/>`);
s.push(`<circle cx="${RX + 11}" cy="${RY - 84}" r="12" fill="url(#g-blanca)"/><circle cx="${RX + 11}" cy="${RY - 84}" r="1.8" fill="#fff"/>`);
s.push(`<circle cx="${RX + 98}" cy="${RY + 2}" r="12" fill="url(#g-verde)"/><circle cx="${RX + 98}" cy="${RY + 2}" r="1.8" fill="#9dffc4"/>`);
for (let y = RY + 26; y < RY + 170; y += entre(7, 12)) {
    const a = (y - RY) / 170;
    s.push(`<rect x="${r1(RX + 10 - 20 * (1 + a))}" y="${r1(y)}" width="${r1(40 * (1 + a))}" height="2" rx="1" fill="#ffd9a0" opacity="${r1(.28 * (1 - a) * 100) / 100}"/>`);
}

s.push('</svg>');
const destino = path.join(__dirname, '..', 'src', 'assets', 'fondos', 'fondo-puerto.svg');
fs.writeFileSync(destino, s.join('\n'));
console.log(`fondo-puerto.svg: ${(fs.statSync(destino).size / 1024).toFixed(1)} KB, ${s.length} elementos, ${luces.length} reflejos`);
