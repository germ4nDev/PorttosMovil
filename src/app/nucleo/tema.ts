/*
    Author: German Valencia
    el núcleo (nucleo/) · tema
    Los mismos colores de la web Angular (tema claro / oscuro y --app-navbar-color),
    expresados como variables CSS para que web y móvil se vean igual.
*/

export type ModoTema = 'claro' | 'oscuro' | 'sistema';

/** Color de la barra superior que se ve hoy en la web. La web permite cambiarlo (Personalizar). */
export const COLOR_BARRA_DEFECTO = '#346BA6';

/** Colores que ofrece el selector de la barra (mismo criterio que la web). */
export const COLORES_BARRA: readonly string[] = ['#346BA6', '#007BFF', '#1B2A41', '#00838F', '#2E7D32', '#6D4CF5', '#C62828', '#37474F'];

export const TOKENS: Record<'claro' | 'oscuro', Record<string, string>> = {
    oscuro: {
        '--pt-fondo': '#242424',
        '--pt-tarjeta': '#2B2B2B',
        '--pt-tarjeta-2': '#222222',
        '--pt-borde': '#474747',
        '--pt-texto': '#E0E0E0',
        '--pt-texto-fuerte': '#FFFFFF',
        '--pt-subtitulo': '#9C9C9C',
        '--pt-pestanas': '#242424',
        '--pt-pestana-texto': '#ABABAB',
        '--pt-nav-inferior': '#1B1B1B',
        '--pt-ia': '#7C5CFF',
        '--pt-enlace': '#4099FF'
    },
    claro: {
        '--pt-fondo': '#E4E4E4',
        '--pt-tarjeta': '#FFFFFF',
        '--pt-tarjeta-2': '#F5F5F5',
        '--pt-borde': '#CECDCD',
        '--pt-texto': '#212529',
        '--pt-texto-fuerte': '#111111',
        '--pt-subtitulo': '#464E57',
        '--pt-pestanas': '#F5F5F5',
        '--pt-pestana-texto': '#464E57',
        '--pt-nav-inferior': '#FFFFFF',
        '--pt-ia': '#6D4CF5',
        '--pt-enlace': '#1F6FD1'
    }
};

/** Colores semánticos de la web (text-info, text-warning, ...), iguales en ambos temas. */
export const SEMANTICOS = {
    info: '#00BCD4',
    advertencia: '#FFB64D',
    primario: '#4099FF',
    exito: '#2ED8B6',
    peligro: '#FF5370'
} as const;

export function normalizarHex(valor: string, defecto = COLOR_BARRA_DEFECTO): string {
    const v = (valor || '').trim();
    const corto = /^#?([0-9a-f]{3})$/i.exec(v);
    if (corto) return ('#' + corto[1].split('').map((c) => c + c).join('')).toUpperCase();
    const largo = /^#?([0-9a-f]{6})$/i.exec(v);
    return largo ? ('#' + largo[1]).toUpperCase() : defecto;
}

/** Luminancia relativa WCAG de un color #RRGGBB. */
export function luminancia(hex: string): number {
    const h = normalizarHex(hex).slice(1);
    const canal = (i: number) => {
        const c = parseInt(h.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Texto blanco o casi negro según el fondo, para que la barra siga legible con cualquier color. */
export function textoSobre(hexFondo: string): '#FFFFFF' | '#111111' {
    const L = luminancia(hexFondo);
    const contrasteBlanco = 1.05 / (L + 0.05);
    const contrasteNegro = (L + 0.05) / 0.05;
    return contrasteBlanco >= contrasteNegro ? '#FFFFFF' : '#111111';
}

export function resolverModo(modo: ModoTema, sistemaOscuro: boolean): 'claro' | 'oscuro' {
    if (modo === 'claro' || modo === 'oscuro') return modo;
    return sistemaOscuro ? 'oscuro' : 'claro';
}

/** Todas las variables CSS a aplicar en :root para un modo y un color de barra. */
export function variablesTema(modo: 'claro' | 'oscuro', colorBarra: string): Record<string, string> {
    const barra = normalizarHex(colorBarra);
    return {
        ...TOKENS[modo],
        '--app-navbar-color': barra,
        '--pt-barra-texto': textoSobre(barra),
        '--pt-info': SEMANTICOS.info,
        '--pt-advertencia': SEMANTICOS.advertencia,
        '--pt-primario': SEMANTICOS.primario,
        '--pt-exito': SEMANTICOS.exito,
        '--pt-peligro': SEMANTICOS.peligro
    };
}
