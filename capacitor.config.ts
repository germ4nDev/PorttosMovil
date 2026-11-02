/*
    Author: German Valencia
    Configuración de Capacitor para Porttos móvil (Android / iOS).
*/
import type { CapacitorConfig } from '@capacitor/cli';

/** Solo con PORTTOS_ANDROID_DEV=1 (npm run android:dev) se permite http hacia el API local. Sin la variable: producción segura. */
const desarrollo = process.env['PORTTOS_ANDROID_DEV'] === '1';

const config: CapacitorConfig = {
    appId: 'co.porttos.movil',
    appName: 'Porttos',
    webDir: 'www',
    server: {
        // Origen de la app dentro del teléfono: https://localhost (Android) y capacitor://localhost (iOS).
        // Ambos deben estar en CORS_ORIGINS del API.
        androidScheme: 'https',
        cleartext: desarrollo
    },
    android: {
        // La página es https://localhost y el API local es http: sin esto Android bloquea las llamadas.
        allowMixedContent: desarrollo
    },
    plugins: {
        SplashScreen: {
            launchShowDuration: 1200,
            backgroundColor: '#242424',
            showSpinner: false
        },
        StatusBar: {
            overlaysWebView: false,
            backgroundColor: '#346BA6',
            style: 'DARK'
        }
    }
};

export default config;
