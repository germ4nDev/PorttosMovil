/*
    Author: German Valencia
    Entorno de desarrollo de Porttos móvil.
    Reutiliza las URLs de la web (un solo lugar para cambiarlas). En un teléfono "localhost" es el propio
    teléfono: para probar contra el API de tu PC escribe aquí su IP de la red local.
*/
//import { environment as web } from '../../../PlataformaIA/src/environments/environment';

/** p. ej. 'http://192.168.1.50:3000/api' y 'http://192.168.1.50:3000'. Vacío = las de la web. */
// const API_LOCAL = 'http://localhost:3000/api';
// const SOCKET_LOCAL = 'http://localhost:3000';
const API_LOCAL = 'https://api.dymsites.co/api';
const SOCKET_LOCAL = 'https://api.dymsites.co';
/** Web de la plataforma: la tableta muestra su Torre de Control en un marco (`<web>/embebido`, OT-014). Vacío = vista nativa. */
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
