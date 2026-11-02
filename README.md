# Porttos móvil (Android / iOS)

App de Porttos para teléfonos y tabletas, hecha con **Angular 17 + Capacitor 7**.
Usa los mismos temas, traducciones, logos y servicios del API que la web (PlataformaIA).

- **Teléfono**: anclado en **vertical**. Encabezado de la web compacto, pestañas y barra inferior de 4 ítems (Tablero · Alertas · Asistente · Ajustes).
- **Tableta**: anclada en **horizontal**. Encabezado y pestañas completos, como en la web.

## Qué se reutiliza de la web (sin copiar archivos)

| Recurso | De dónde sale |
|---|---|
| URLs del API y del socket | `PlataformaIA/src/environments/environment*.ts` (importadas por `src/environments`) |
| Traducciones | `PlataformaIA/src/assets/i18n/{es,en}.json` + `src/assets/i18n-movil/` (solo las llaves `MOVIL.*`) |
| Logos, banderas, fondo del ingreso y fuente Poppins | `PlataformaIA/src/assets/...` (los copia `angular.json` al compilar) |
| Lógica compartida (sesión, tema, pestañas, puertos) | `PorttosMovil/src/app/nucleo` vía el alias `@nucleo` |

## Estructura

```
src/app/
  core/          servicios: sesión, interceptor, guard, socket, puerto, pestañas, tema, idioma, dispositivo, nativo, almacén
  compartido/    íconos SVG
  widgets/       tarjetas del tablero: kpi-tarjeta, lista-tarjeta, grafica-tarjeta, detalle-kpi
  paginas/       login, armazon (encabezado + pestañas + barra inferior), tablero, alertas, asistente, ajustes
```

Reglas (las verifica `_pruebas/movil-app.test.js`):

- Las páginas no usan `HttpClient`, `localStorage` ni `socket.io-client`: todo pasa por `core/`.
- Los plugins de Capacitor solo se importan en `core/almacen.service.ts` y `core/nativo.service.ts`.
- Nada fijo a un puerto: la lista sale de `/api/puertos`.

## Primer arranque

Requisitos: Node 18+ (recomendado 20), Android Studio (Android) y Xcode 16 en una Mac (iOS).

```bash
cd PorttosMovil
npm install
npm start            # en el navegador, http://localhost:4200
```

Para probar en un teléfono contra el API de tu PC, escribe la IP de tu red en
`src/environments/environment.ts` (`API_LOCAL` y `SOCKET_LOCAL`).

### Android e iOS (una sola vez)

```bash
npm run build:prod
npx cap add android
npx cap add ios        # solo en Mac
npm run android        # compila, sincroniza y abre Android Studio
npm run ios            # compila, sincroniza y abre Xcode
```

### Orientación fija también en el sistema operativo

La app fija la orientación al arrancar (`@capacitor/screen-orientation`). Para que tampoco gire en la pantalla
de carga, después de `npx cap add ios` deja así `ios/App/App/Info.plist`:

```xml
<key>UISupportedInterfaceOrientations</key>
<array><string>UIInterfaceOrientationPortrait</string></array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

En Android no se fija en el `AndroidManifest.xml` (allí no se distingue teléfono de tableta); lo hace la app al arrancar.

## API: lo que hay que habilitar

En el `.env` del API, `CORS_ORIGINS` debe incluir los orígenes de la app:

```
CORS_ORIGINS=capacitor://localhost,https://localhost,http://localhost
```

> **Una sola sesión por usuario sin importar el dispositivo** (decisión del 2026-10-24): al entrar en el teléfono se cierra
> la sesión de la web y al revés. La app escucha `sesion-reemplazada` y vuelve al ingreso al instante, y solo el
> dispositivo de la sesión activa recibe notificaciones.

## Notificaciones push (fase 3)

1. Corre la migración `PlataformaApiIA/database/migraciones/019_movil_push.sql`.
2. En la consola de Firebase crea el proyecto, agrega las apps Android (`co.porttos.movil`) e iOS, y en iOS sube la
   llave APNs (Configuración del proyecto → Cloud Messaging).
3. Copia `google-services.json` en `android/app/` y `GoogleService-Info.plist` en `ios/App/App/` (después de `npx cap add`).
   En Xcode activa *Push Notifications* y *Background Modes → Remote notifications*.
4. En el `.env` del API (ya están las llaves, vacías): `PUSH_ENABLED=true`, `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL` y
   `FCM_PRIVATE_KEY` de una cuenta de servicio de Firebase (con los saltos de línea escritos como `\n`).
5. En la app: Ajustes → Notificaciones → activar y «Enviar notificación de prueba».

Se avisa cuando el Analista IA **publica** una alerta (fuera del modo sombra), según la severidad mínima y los puertos
que elija cada usuario; nunca se repite la misma alerta al mismo dispositivo y si son más de 3 a la vez llega un resumen.

## Fases

1. **Cimientos** (hecha): proyecto, sesión JWT + `x-sesion-id`, temas, traducciones, encabezado y pestañas de la web, orientación, socket.
2. **Widgets móviles por pestaña** (hecha): `GET /api/movil/tablero/:puerto/:pestana` (API, `utils/movil/tablero-movil.js`) y en la app `widgets/` (KPI con mini-gráfica de 24 h y detalle, listas, una gráfica por tarjeta en SVG propio), recarga cada 60 s y copia sin conexión.
3. **Alertas, Asistente y notificaciones** (hecha): páginas Alertas (Alertas · Tendencias · Turno, con «Útil» / «No era») y Asistente con los mismos endpoints de la web; notificaciones push con Firebase; sesión única con cierre inmediato si se entra en otro dispositivo.
4. **Mapa, biometría y almacenamiento seguro** (hecha): pestaña Mapa Logístico con MapLibre (mismos mapas de MapTiler que la web), naves por estado, camiones y eventos viales desde `GET /api/movil/mapa/:puerto`, botón IA flotante con el panel del analista; ingreso con huella o Face ID; sesión y credenciales cifradas en Keychain / Keystore.

## Mapa y biometría (fase 4)

- **MapTiler**: la app usa la misma clave de cliente que el mapa de la web (`environment.mapTilerKey`). En la cuenta de
  MapTiler, si la clave restringe orígenes, agrega `https://localhost` y `capacitor://localhost`.
- **iOS**: en `ios/App/App/Info.plist` agrega `NSFaceIDUsageDescription` (p. ej. «Porttos usa Face ID para ingresar sin
  escribir la clave»). Sin esa línea iOS cierra la app al pedir Face ID.
- **Android**: el plugin de biometría declara sus permisos; no hace falta tocar el manifiesto.
- El ingreso con biometría se ofrece una vez, después de entrar con usuario y clave. Las credenciales quedan cifradas en
  el Keychain / Keystore y solo se leen después de confirmar la huella o el rostro. Si la clave cambia, se borran y se
  vuelve a pedir el ingreso normal. Se desactiva en Ajustes → Seguridad.
- La sesión («Recordarme») también vive cifrada; la que estaba en Preferences se migra sola al abrir la app.

## Widgets del layout de la web (2026-10-24)

Cada pestaña muestra los widgets del tablero del usuario en la web (`dbo.PTLLayouts`) o, si no lo ha
personalizado, los del tablero por defecto (`dbo.PTLWidgetsMaestro`, `inicial = 1`), en el mismo orden.
El API los traduce al teléfono en `PlataformaApiIA/utils/movil/widgets-movil.js` (140 de los 144 widgets de la web);
los que no tienen versión móvil se listan al final de la pestaña como «solo se ven en la web».
Para agregar la versión móvil de un widget nuevo: una entrada en `CATALOGO` de ese archivo y una prueba en
`_pruebas/movil-widgets.test.js` (la prueba de cobertura falla si un widget del `widget-registry` de la web no tiene versión).
