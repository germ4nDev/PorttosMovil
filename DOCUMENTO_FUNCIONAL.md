# DOCUMENTO FUNCIONAL Y MANUAL DE OPERACIONES
## Porttos Móvil (Android / iOS) - Plataforma IA

---

## 1. Propósito y Alcance del Sistema

**Porttos Móvil** es la aplicación móvil corporativa diseñada para acompañar a directivos, administradores de puerto, analistas de operaciones y coordinadores en el seguimiento de operaciones portuarias, monitoreo de indicadores de gestión (KPI), atención de alertas operativas e interacción con el Asistente de Inteligencia Artificial de Porttos.

### 1.1 Modalidades de Dispositivo y Pantalla
- **Modo Teléfono (Pantalla Vertical / Portrait)**:
  Diseño optimizado para operar con una sola mano. Incluye encabezado compacto, selector de puerto, menú lateral desplegable y una barra inferior con acceso a las cuatro secciones principales: **Tablero**, **Alertas**, **Asistente** y **Ajustes**.
- **Modo Tableta (Pantalla Horizontal / Landscape)**:
  Diseño extendido que aprovecha la pantalla completa. Presenta el encabezado con reloj y fecha en tiempo real, barra de pestañas superior tipo escritorio y opción de visualización directa de la Torre de Control Web.

---

## 2. Flujo de Acceso y Seguridad de Usuario

### 2.1 Pantalla de Ingreso (*Login*)
El acceso a la aplicación está protegido por la autenticación corporativa de Porttos.
- **Campos de Acceso**:
  - **Usuario**: Identificador de cuenta registrado en la plataforma.
  - **Contraseña**: Clave de acceso del usuario.
  - **Recordarme**: Mantiene la sesión iniciada en el dispositivo.
- **Visualización de Clave**: Botón con ícono de ojo para mostrar u ocultar los caracteres ingresados.

### 2.2 Autenticación Biométrica (Huella Dactilar / Face ID)
- **Activación Opcional**: Tras un inicio de sesión exitoso con usuario y contraseña, la aplicación pregunta al usuario si desea activar el acceso con biometría.
- **Ingreso Inmediato**: En los siguientes accesos, la app solicitará directamente la huella dactilar o el reconocimiento facial sin necesidad de digitar la contraseña.
- **Desactivación**: Puede desactivarse en cualquier momento desde la sección *Ajustes -> Seguridad*.

### 2.3 Regla de Sesión Única por Usuario
Por políticas de seguridad operacional, un usuario solo puede tener una sesión activa. Si el usuario inicia sesión en la plataforma web mientras tiene la aplicación abierta en su teléfono, la aplicación notificará al instante el reemplazo de sesión y cerrará la cuenta de forma segura.

---

## 3. Navegación y Estructura Principal (*Armazón*)

### 3.1 Encabezado Superior
- **Logo de Porttos**: Adaptativo según el tema visual activo (oscuro o claro).
- **Selector de Puerto Activo**: Permite alternar la información entre los distintos puertos configurados o seleccionar **TODOS** para una visión consolidada.
- **Reloj y Fecha**: Muestra la hora del sistema y la fecha formateada según el idioma seleccionado (*Español / Inglés*).

### 3.2 Menú Lateral Desplegable
- Accesible mediante el botón ☰ en la esquina superior o deslizando el dedo desde el borde izquierdo de la pantalla hacia la derecha.
- Permite seleccionar el puerto activo y explorar las pestañas operativas disponibles.

### 3.3 Barra de Navegación Inferior (Teléfonos)
Ubicada en la parte inferior de la pantalla para acceso inmediato a los cuatro módulos:
1. 📊 **Tablero**: Indicadores, gráficos y estado operativo.
2. ⚠️ **Alertas**: Hallazgos y detección de anomalias por IA.
3. 💬 **Asistente**: Chat de consulta operativa con IA.
4. ⚙️ **Ajustes**: Configuración de apariencia, idioma y notificaciones.

---

## 4. Módulo Tablero de Control

El **Tablero** presenta los datos operativos organizados según las preferencias del usuario en la plataforma web (`Tu tablero`) o la plantilla por defecto (`Tablero por defecto`).

### 4.1 Tarjetas de Indicadores (KPIs)
- Muestran valores clave de operación (tonelaje, tiempo de espera, nivel de ocupación, etc.).
- Incluyen tendencia visual, unidad de medida y mini-gráfica histórica de las últimas 24 horas.
- **Detalle de KPI**: Al presionar sobre cualquier tarjeta de KPI, se despliega una vista detallada con la curva ampliada de 24 horas y estadísticas mínimas/máximas.

### 4.2 Telemetría en Tiempo Real (GNL / GNL Vivo)
- Para terminales con operaciones de Gas Natural Licuado (GNL), la app actualiza automáticamente los datos de presión, flujo y temperatura de tanques y brazos de carga mediante canales directos en tiempo real.

### 4.3 Listas y Gráficas del Tablero
- **Listas**: Resumen de buques programados, amarrados o en maniobra.
- **Gráficas**: Gráficas de barras, líneas y sectores que se adaptan a la pantalla del dispositivo.

---

## 5. Módulo Alertas del Analista IA

El Analista de Inteligencia Artificial monitorea constantemente la operación portuaria para detectar desviaciones, demoras anormales o eventos críticos.

### 5.1 Vistas del Módulo de Alertas
1. **Alertas Activas**: Lista de hallazgos detectados con código de severidad (*Crítica, Alta, Media, Baja*), puerto afectado, confianza del modelo y explicación detallada.
2. **Tendencias**: Análisis de patrones operativos que están mejorando o empeorando en el tiempo.
3. **Turno**: Resumen ejecutivo consolidado del estado de la operación durante el turno actual.

### 5.2 Calificación de Alertas (Retroalimentación al Modelo)
Cada alerta permite al operador calificar la utilidad del hallazgo:
- 👍 **Útil (Confirmado)**: Valida que la alerta detectada por la IA fue acertada.
- 👎 **No era (Falso)**: Informa al sistema que el hallazgo no representaba una anomalía real para ajustar el modelo.

### 5.3 Notificaciones Push de Alertas Críticas
Cuando el Analista IA publica una alerta importante, la app envía una notificación push al teléfono celular (incluso si la app está cerrada), permitiendo al usuario ingresar directamente a revisar el hallazgo.

---

## 6. Módulo Asistente IA de Operaciones

El **Asistente de Porttos** es un chat conversacional entrenado para responder preguntas sobre la operación, el estado de los puertos y los indicadores marítimos.

### 6.1 Funcionalidades del Asistente
- **Preguntas en Lenguaje Natural**: El usuario puede escribir preguntas como:
  - *"¿Cuál es el tiempo medio de espera de buques en el puerto actual?"*
  - *"Resumen de las operaciones del turno de hoy."*
  - *"¿Qué naves están programadas para atracar esta tarde?"*
- **Sugerencias Rápidas**: Presenta botones con preguntas de ejemplo para agilizar la consulta.
- **Fuentes de Respaldo**: Cada respuesta incluye la lista de tablas y datos utilizados para responder, así como avisos si alguna cifra proviene de un sensor sin señal.

---

## 7. Módulo Mapa Logístico Interactivo

Disponible en la pestaña de **Mapa Logístico**, proporciona un mapa interactivo vectorial de alta precisión.

### 7.1 Capas del Mapa
- ⭕ **Geocercas y Faros**: Delimitación geográfica de las zonas de control en cada puerto.
- 🚢 **Naves por Estado**: Ubicación geográfica de buques diferenciados por color según su estado (*Atrakado, Fondeado, Maniobra, En tránsito*).
- 🚚 **Camiones**: Vehículos de carga en movimiento dentro del corredor logístico.
- ⚠️ **Eventos Viales**: Incidentes, bloqueos o congestión en las vías de acceso a las terminales.

### 7.2 Interacción en el Mapa
- **Ficha Informativa**: Al presionar sobre cualquier buque, camión o evento, se abre una ventana flotante con el nombre, velocidad, rumbo, agencia y hora del último reporte.
- **Alertas en el Mapa**: Muestra una campana con las alertas georreferenciadas. Al seleccionar una alerta, el mapa se desplaza automáticamente (*vuela*) hacia las coordenadas del evento y muestra un marcador con pulso luminoso.
- **Botón IA Flotante**: Permite abrir el panel del Analista IA sobrepuesto en el mapa sin perder la vista geográfica.

---

## 8. Módulo de Configuración y Ajustes

Sección encargada del control de preferencias personales del usuario:

- **Tema Visual**: Alterna entre tema **Claro**, **Oscuro** o ajuste automático según el **Sistema**.
- **Color de Barra Superior**: Permite personalizar el tono de la barra de título con la paleta de colores de Porttos.
- **Idioma**: Alterna al instante la interfaz entre **Español** e **Inglés**.
- **Notificaciones**: Activa o desactiva la recepción de alertas push y permite enviar una *Notificación de prueba*.
- **Seguridad y Biometría**: Habilita o deshabilita la autenticación con huella dactilar o reconocimiento facial.
- **Información del Sistema**: Muestra la versión de la app, el nombre del servidor conectado y el usuario en sesión.
