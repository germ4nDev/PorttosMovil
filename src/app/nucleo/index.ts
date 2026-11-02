/*
    Author: German Valencia
    Núcleo de la app móvil (antes PorttosCore/ en la raíz; renombrado 2026-10-25): lógica pura que la web puede adoptar.
    Regla: aquí solo va TypeScript puro (sin Angular, sin DOM obligatorio, sin HTTP),
    para que se pueda probar con node y reutilizar en cualquier cliente.
*/
export * from './sesion';
export * from './tema';
export * from './pestanas';
export * from './dispositivo';
export * from './tablero';
export * from './ia';
export * from './mapa';
export * from './gnl';
export * from './gnl-graficas';
export * from './rejilla';
export * from './alertas-mapa';
export * from './marco-web';
