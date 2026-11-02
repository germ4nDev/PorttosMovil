/*
    Author: German Valencia
    Entorno de producción de Porttos móvil: mismas URLs que la web en producción (API desplegado el 2026-10-29).
*/
//import { environment as web } from '../../../PlataformaIA/src/environments/environment.prod';
const API_PRODUCCION = 'https://api.dymsites.co/api';
const SOCKET_PRODUCCION = 'https://api.dymsites.co';
/** Web de la plataforma: la tableta muestra su Torre de Control en un marco (`<web>/embebido`, OT-014). */
const WEB_PRODUCCION = 'https://plataforma.dymsites.co';

export const environment = {
    production: true,
    appVersion: '0.1.0',
    apiUrl: API_PRODUCCION,
    sctUrl: SOCKET_PRODUCCION,
    webUrl: WEB_PRODUCCION,
    // apiUrl: (web as any).apiUrl as string,
    // sctUrl: (web as any).sctUrl as string,
    codigoModulo: '19dbd560-5ace-4386-865a-17605dd9bca4',
    codigoSuite: 'a815687f-b9b6-4404-83dd-9a4074224320',
    codigoAplicacion: '3eb98a9f-cc5d-417d-95ea-a2b8abc3b5fa',
    /** Clave de cliente de MapTiler: la misma del mapa logístico de la web. En MapTiler debe permitir los orígenes de la app
     *  (https://localhost y capacitor://localhost). */
    mapTilerKey: 'WMNuRXDl7kbmZ19cOGo2'
};
