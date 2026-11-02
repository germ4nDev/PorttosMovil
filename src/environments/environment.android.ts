/*
    Author: German Valencia
    Entorno de desarrollo de Porttos móvil para el emulador de Android (configuración «android» de angular.json).
    En el emulador el PC es 10.0.2.2 ("localhost" es el propio emulador). En un teléfono físico por USB/wifi, usar aquí
    la IP del PC en la red local (p. ej. 'http://192.168.1.50:3000/api').
    No importa ./environment: la sustitución de archivos lo volvería circular. Mismas llaves que environment.ts (hay prueba).
*/

const API_LOCAL = 'http://10.0.2.2:3000/api';
const SOCKET_LOCAL = 'http://10.0.2.2:3000';
// const API_LOCAL = 'https://api.dymsites.co/api';
// const SOCKET_LOCAL = 'https://api.dymsites.co';
/** Web de la plataforma para el marco de la tableta (OT-014). Local: 'http://localhost:4200' con `adb reverse tcp:4200 tcp:4200`
 *  (y el API con `adb reverse tcp:3000 tcp:3000`) y `ng serve --host 127.0.0.1` (solo en IPv6, adb no lo alcanza). */
// const WEB_LOCAL = 'http://localhost:4200';
const WEB_LOCAL = 'https://plataforma.dymsites.co';

export const environment = {
    production: false,
    appVersion: '0.1.0',
    apiUrl: API_LOCAL,
    sctUrl: SOCKET_LOCAL,
    webUrl: WEB_LOCAL,
    /** Mismo módulo que registra la web al iniciar sesión. */
    codigoModulo: '19dbd560-5ace-4386-865a-17605dd9bca4',
    /** Suite y aplicación de Porttos para leer las pestañas (igual que torre-control.component). */
    codigoSuite: 'a815687f-b9b6-4404-83dd-9a4074224320',
    codigoAplicacion: '3eb98a9f-cc5d-417d-95ea-a2b8abc3b5fa',
    /** Clave de cliente de MapTiler: la misma del mapa logístico de la web. En MapTiler debe permitir los orígenes de la app
     *  (https://localhost y capacitor://localhost). */
    mapTilerKey: 'WMNuRXDl7kbmZ19cOGo2'
};
