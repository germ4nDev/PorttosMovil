/*
    Author: German Valencia
    Protege las páginas internas: sin sesión válida, al ingreso. Con sesión, el ingreso salta al tablero.
*/
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tokenExpirado } from '@nucleo';
import { SesionService } from './sesion.service';

export const conSesion: CanActivateFn = async () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    await sesion.restaurar();
    const s = sesion.sesion();
    if (s && !tokenExpirado(s.token)) return true;
    if (s) await sesion.cerrar('expirada');
    return router.parseUrl('/login');
};

export const sinSesion: CanActivateFn = async () => {
    const sesion = inject(SesionService);
    const router = inject(Router);
    await sesion.restaurar();
    return sesion.sesion() ? router.parseUrl('/app/tablero') : true;
};
