# Núcleo de la app móvil (`PorttosMovil/src/app/nucleo`)

> Antes se llamaba `el núcleo (nucleo/)/` en la raíz (renombrado el 2026-10-25 para no confundirlo con la API en TypeScript
> «el núcleo (nucleo/)» que se archivó el 2026-10-17). No tiene relación con esa API.

Lógica pura de la app móvil (**PorttosMovil**), escrita para que la web pueda adoptarla después.

Solo TypeScript puro: sin Angular, sin HTTP y sin depender del navegador. Así se prueba con node
(`_pruebas/movil-core.test.js`) y se reutiliza en cualquier cliente.

| Archivo | Qué resuelve |
|---|---|
| `sesion.ts` | Leer la respuesta del login, cabeceras `x-token` / `x-sesion-id`, URLs públicas, vencimiento del JWT, iniciales del avatar |
| `tema.ts` | Colores de los temas claro y oscuro de la web, `--app-navbar-color`, contraste del texto de la barra |
| `pestanas.ts` | Ícono y color de cada pestaña (igual que `obtenerIconoPestana` de la web) y orden por preferencias del usuario |
| `dispositivo.ts` | Teléfono vs. tableta y su orientación fija, lista de puertos, fecha y hora del encabezado |

## Cómo se usa

- **Móvil**: `PorttosMovil/tsconfig.json` define el alias `@nucleo` → `app/nucleo/index.ts`.
- **Web**: puede adoptar el mismo alias en `PlataformaIA/tsconfig.json` y reemplazar, por ejemplo,
  la lectura de cabeceras del `AuthInterceptor`. Se deja para una fase posterior para no tocar la web en caliente.

## Reglas

- Nada de `import` de `@angular/*`, `rxjs` ni APIs del navegador sin respaldo.
- Toda función nueva lleva su prueba en `_pruebas/movil-core.test.js`.
