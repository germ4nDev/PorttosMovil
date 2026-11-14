/*
    Author: German Valencia
    Description: Copia a src/assets-web los recursos que la app toma de la web (traducciones, banderas, logos, slider y Poppins).
    Desde Angular 18+ con @angular/build los assets deben estar dentro del proyecto (OT-035); antes angular.json los leía de
    ../PlataformaIA. La carpeta destino no se versiona: se regenera en cada build o serve.
*/
const fs = require('fs');
const path = require('path');

const web = path.resolve(__dirname, '../../PlataformaIA/src/assets');
const destino = path.resolve(__dirname, '../src/assets-web');
const recursos = [
    { carpeta: 'i18n', filtro: /\.json$/i },
    { carpeta: 'images/porttos', filtro: /^porttos-.*\.png$/i },
    { carpeta: 'flags', filtro: /\.png$/i },
    { carpeta: 'images/slider', filtro: null },
    { carpeta: 'fonts/poppins', filtro: null }
];

fs.rmSync(destino, { recursive: true, force: true });
let total = 0;
for (const { carpeta, filtro } of recursos) {
    const origen = path.join(web, carpeta);
    if (!fs.existsSync(origen)) throw new Error(`No existe ${origen}: la app necesita los recursos de PlataformaIA`);
    fs.cpSync(origen, path.join(destino, carpeta), {
        recursive: true,
        filter: (archivo) => fs.statSync(archivo).isDirectory() || !filtro || filtro.test(path.basename(archivo))
    });
    total += fs.readdirSync(path.join(destino, carpeta), { recursive: true }).length;
}
console.log(`recursos de la web copiados a src/assets-web (${total} entradas)`);
