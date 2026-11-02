/*
    Author: German Valencia
    Fondo del ingreso de la app con la foto aérea del puerto (pedido del usuario, 2026-10-25: «trata de mejorar enfoque y lo que puedas»).
    Toma herramientas/fuentes/puerto-aereo-original.webp (1113×606, foto entregada por el usuario) y escribe
    src/assets/fondos/fondo-puerto.webp mejorada:
      1. Ampliación al doble con Lanczos 3 (en el teléfono la foto se ve ~3,5 veces más grande que el original).
      2. Contraste local (CLAHE suave) para quitar la bruma de la toma aérea sin quemar el cielo ni el agua.
      3. Enfoque (unsharp mask) para recuperar bordes de buques, grúas, silos y contenedores.
      4. Un poco más de contraste y saturación (el original es verdoso y apagado).
    Usa sharp del API (PlataformaApiIA/node_modules): la app no lo necesita en su package.json.
    Uso (desde PorttosMovil): node herramientas/mejorar-foto-fondo.js
*/
const path = require('path');
const sharp = require(path.join(__dirname, '..', '..', 'PlataformaApiIA', 'node_modules', 'sharp'));

const ORIGEN = path.join(__dirname, 'fuentes', 'puerto-aereo-original.webp');
const DESTINO = path.join(__dirname, '..', 'src', 'assets', 'fondos', 'fondo-puerto.webp');

async function main() {
    const { width, height } = await sharp(ORIGEN).metadata();
    const info = await sharp(ORIGEN)
        .resize({ width: width * 2, height: height * 2, kernel: sharp.kernel.lanczos3 })
        .clahe({ width: 160, height: 160, maxSlope: 2 })
        .sharpen({ sigma: 1.4, m1: 0.6, m2: 2.2, x1: 2, y2: 10, y3: 20 })
        .modulate({ saturation: 1.12, brightness: 1.01 })
        .linear(1.06, -7)
        .webp({ quality: 84, smartSubsample: true, effort: 6 })
        .toFile(DESTINO);
    console.log(`fondo-puerto.webp: ${info.width}×${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
}

main().catch((e) => { console.error(e); process.exit(1); });
