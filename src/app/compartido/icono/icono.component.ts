/*
    Author: German Valencia
    Íconos en SVG en línea (sin fuentes externas), trazo de 2 px como los de la web.
    Incluye los de las pestañas (el núcleo (nucleo/).IconoPestana) y los de la interfaz.
*/
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

const TRAZOS: Record<string, string> = {
    barco: 'M2 20c2 1 4 1 6 0s4-1 6 0 4 1 6 0M4 18l-1-5h18l-2 5M6 13V7h8l3 6M10 7V3h3',
    camion: 'M1 4h14v11H1zM15 9h4l3 3v3h-7M5.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM18.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    bodega: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
    contenedor: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16zM3.3 7 12 12l8.7-5M12 22V12',
    gnl: 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-7 0 3 1 4 3 5 0-4-1-7 0-10z',
    mapa: 'M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4zM8 2v16M16 6v16',
    noticias: 'M4 4h13v16H6a2 2 0 0 1-2-2zM17 8h3v10a2 2 0 0 1-2 2M8 8h5M8 12h5M8 16h5',
    granel: 'M12 22V12M12 12C12 7 8 4 3 4c0 5 4 8 9 8zM12 12c0-4 3-7 8-7 0 4-3 7-8 7z',
    suelta: 'M5 17h14l-1.5-6h-11zM7 11l2-5h6l2 5M7.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
    capacidad: 'M3 21V8l9-5 9 5v13M7 21v-8h10v8M7 17h10',
    tablero: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z',
    campana: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    engranaje: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 7.2 19.73l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.2 14H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.27 7.2l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 10 3.2V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 2.8 1.18l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 20.8 10H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    inicio: 'M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z',
    usuario: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    candado: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    ojo: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    ojoTachado: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22M14.12 14.12a3 3 0 1 1-4.24-4.24',
    salir: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    flechaAbajo: 'M6 9l6 6 6-6',
    nube: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
    nubeTachada: 'M22.61 16.95A5 5 0 0 0 18 10h-1.26a8 8 0 0 0-7.05-6M5 5a8 8 0 0 0 4 15h9a5 5 0 0 0 1.7-.3M1 1l22 22',
    ia: 'M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z',
    sol: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
    luna: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
    movil: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM12 18h.01',
    huella: 'M12 11c0 3.5-1 6-3 8M8 11a4 4 0 0 1 8 0c0 2-.3 4-1 6M5 12a7 7 0 0 1 14-1M19 13c0 2.5-.5 4.5-1.5 6.5',
    check: 'M20 6 9 17l-5-5',
    menu: 'M3 6h18M3 12h18M3 18h18',
    buscar: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.35-4.35',
    cerrarX: 'M18 6 6 18M6 6l12 12',
    puerto: 'M12 22V8M5 12H2a10 10 0 0 0 20 0h-3M12 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    capas: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
    centrar: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v3M12 19v3M2 12h3M19 12h3',
    rostro: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1 4.5 1 6 0',
    recargar: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
    // Gráficas de GNL (OT-005): los íconos feather de la web (compass, activity, thermometer, zap, maximize)
    medidor: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z',
    actividad: 'M22 12h-4l-3 9L9 3l-3 9H2',
    termometro: 'M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z',
    rayo: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
    ampliar: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3'
};

@Component({
    selector: 'pm-icono',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './icono.component.html',
    styleUrl: './icono.component.scss'
})
export class IconoComponent {
    @Input({ required: true }) nombre = '';
    @Input() tam = 20;
    @Input() grosor = 2;

    get trazo(): string {
        return TRAZOS[this.nombre] || TRAZOS['tablero'];
    }
}
