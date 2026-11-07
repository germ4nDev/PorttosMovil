# Documentación Técnica - Porttos Móvil

## 1. Visión General de la Aplicación

**Porttos Móvil** es la aplicación móvil oficial de Porttos para dispositivos móviles (teléfonos y tabletas), desarrollada con **Angular 17** y **Capacitor 7**. La aplicación reutiliza la identidad visual, los temas, las traducciones, la lógica de negocio y las APIs de la plataforma web.

- **Paquete Android**: `co.porttos.movil`
- **Stack Técnico**: Angular 17 (Standalone Components), Capacitor 7, TypeScript, RxJS, Chart.js, MapLibre GL.
- **Plataformas Soportadas**: Android (Android 5.0 / API 21+ mínimo; Android 7.0 / API 24+ recomendado) e iOS (iOS 14+).
- **Adaptabilidad de Pantalla**:
  - **Teléfono**: Orientación vertical (Portrait). Interfaz compacta con encabezado, pestañas y barra de navegación inferior de 4 ítems (*Tablero · Alertas · Asistente · Ajustes*).
  - **Tableta**: Orientación horizontal (Landscape). Encabezado y navegación extendida tipo escritorio.

---

## 2. Arquitectura del Proyecto

### 2.1 Estructura de Directorios

```
PorttosMovil/
├── android/                        # Proyecto nativo Android (Gradle, Capacitor Plugins, Manifest)
│   ├── app/src/main/
│   │   ├── java/co/porttos/movil/  # MainActivity.java (extends BridgeActivity)
│   │   ├── res/                    # Recursos visuales, íconos y temas nativos
│   │   └── AndroidManifest.xml     # Configuración del manifiesto nativo de Android
│   └── build.gradle                # Configuración de Gradle raíz del proyecto
├── src/
│   ├── app/
│   │   ├── core/                   # Servicios globales (Sesión, Socket, Nativo, Biometría, etc.)
│   │   ├── paginas/                # Páginas de la aplicación (Login, Tablero, Alertas, Asistente, Ajustes)
│   │   ├── widgets/                # Componentes visuales y tarjetas del tablero (KPI, Gráficas, Mapas)
│   │   └── compartido/             # Componentes compartidos e íconos SVG
│   ├── assets/                     # Recursos gráficos, fuentes e i18n
│   └── environments/               # Entornos de configuración (Desarrollo, Android, Producción)
├── capacitor.config.ts             # Configuración principal del puente Capacitor
├── DOCUMENTACION_TECNICA.md        # Documentación técnica del proyecto
└── package.json                    # Dependencias y scripts de construcción
```

### 2.2 Principios de Diseño y Buenas Prácticas

1. **Abstracción Total en `core/`**: Ninguna página o componente UI consume directamente `HttpClient`, `localStorage` ni `socket.io-client`. Toda comunicación de red y almacenamiento se canaliza mediante los servicios centralizados de `core/`.
2. **Encapsulamiento de Plugins Nativo**: Los plugins de Capacitor solo se importan dentro de los servicios de infraestructura (`almacen.service.ts`, `nativo.service.ts`, `biometria.service.ts` y `notificaciones.service.ts`).
3. **Gestión Dinámica de Puertos**: La aplicación no tiene puertos ni instalaciones fijas; la lista de puertos se obtiene de la API (`/api/puertos`).
4. **Unicidad de Sesión**: La plataforma mantiene una sola sesión activa por usuario. Si el usuario inicia sesión en la web mientras tiene la app abierta, la app recibe el evento `sesion-reemplazada` por WebSocket y redirige inmediatamente al login.

---

## 3. Catálogo de Servicios Core (`src/app/core/`)

| Servicio | Responsabilidad / Descripción |
|---|---|
| `sesion.service.ts` | Gestión del ciclo de vida del token JWT, cabecera `x-sesion-id` y login/logout. |
| `nativo.service.ts` | Control de funciones nativas del dispositivo (Orientación de pantalla, Status Bar, Splash Screen). |
| `biometria.service.ts` | Autenticación biométrica (Huella Dactilar / Face ID) mediante `@aparajita/capacitor-biometric-auth`. |
| `almacen.service.ts` | Almacenamiento seguro cifrado en Keystore (Android) / Keychain (iOS) vía `@aparajita/capacitor-secure-storage`. |
| `notificaciones.service.ts` | Registro y recepción de notificaciones push vía Firebase Cloud Messaging (`@capacitor/push-notifications`). |
| `socket.service.ts` | Comunicación bidireccional en tiempo real mediante WebSockets (Socket.IO). |
| `tablero.service.ts` | Obtención y maquetado de los layouts y widgets móviles desde la API. |
| `mapa.service.ts` | Integración del mapa logístico dinámico con MapLibre GL y MapTiler. |
| `idioma.service.ts` | Gestión del idioma local e integración con NgxTranslate (`es`, `en`). |
| `tema.service.ts` | Gestión de temas visuales (Claro / Oscuro) sincronizados con la web. |

---

## 4. Configuración Nativa Android

### 4.1 Configuración de Gradle y Manifest
- **Namespace y Application ID**: `co.porttos.movil`
- **MainActivity**: Hereda de `com.getcapacitor.BridgeActivity`.
- **AndroidManifest.xml**:
  - Permiso `INTERNET` habilitado.
  - Configuración de `FileProvider` para compartir archivos de forma segura.
  - Filtro de intent `MAIN` / `LAUNCHER` registrado en `MainActivity`.
- **Compatibilidad**:
  - Gradle `8.7.2`
  - Android Compile SDK: `34`
  - Target SDK: `34`

### 4.2 Esquema de Servidor Nativo (`capacitor.config.ts`)
- `androidScheme`: `"https"`
- `allowMixedContent`: Habilitado para desarrollo local mediante la variable de entorno `PORTTOS_ANDROID_DEV=1`.
- Esquema de origen en la app: `https://localhost` (Android) y `capacitor://localhost` (iOS).

### 4.3 Notificaciones Push (Firebase Cloud Messaging)
- Archivo de configuración: `android/app/google-services.json`
- Servicio receptor integrado en el Android Manifest por el plugin `@capacitor/push-notifications`.

---

## 5. Guía de Construcción y Despliegue

### 5.1 Requisitos del Entorno
- **Node.js**: v18.x o v20.x
- **Angular CLI**: v17.x
- **Android Studio**: Ladybug / 2024.2.1+ con Android SDK 34
- **JDK**: OpenJDK 17+

### 5.2 Comandos del Proyecto

```bash
# 1. Instalación de dependencias
npm install

# 2. Desarrollo local en navegador web
npm start

# 3. Ejecución de pruebas de arquitectura y reglas
npm run test:core

# 4. Compilación web de producción y sincronización con plataformas nativas
npm run cap:sync

# 5. Abrir el proyecto en Android Studio (modo producción)
npm run android

# 6. Abrir el proyecto en Android Studio (modo desarrollo local HTTP)
npm run android:dev
```

---

## 6. Seguridad y Almacenamiento

- **Credenciales y Tokens Cifrados**: Las credenciales de sesión ("Recordarme") y tokens de acceso se almacenan cifrados mediante `@aparajita/capacitor-secure-storage`, utilizando **Android Keystore System** en Android y **Keychain** en iOS.
- **Biometría de Acceso**: La biometría es opcional y se configura tras el primer inicio de sesión exitoso. Las credenciales cifradas solo se desencriptan al verificar satisfactoriamente la huella dactilar o rostro del usuario.
