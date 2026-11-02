/*
    Author: German Valencia
    Interceptor de sesión: agrega x-token y x-sesion-id (mismas cabeceras que la web, desde el núcleo (nucleo/))
    y, ante un 401 fuera del login, cierra la sesión y vuelve al ingreso.
*/
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { cabecerasSesion, esUrlPublica } from '@nucleo';
import { SesionService } from './sesion.service';

export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
    // Las URL públicas (traducciones, login) pasan sin tocar la sesión: así cargar el idioma al arrancar
    // no crea SesionService antes de tiempo (evita una dependencia circular en la inyección)
    if (esUrlPublica(req.url)) return next(req);
    const sesion = inject(SesionService);
    const peticion = req.clone({ setHeaders: cabecerasSesion(sesion.sesion()) });

    return next(peticion).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401 && sesion.sesion()) {
                const msg: string = err.error?.msg || '';
                void sesion.cerrar(/reemplazada|otro dispositivo/i.test(msg) ? 'reemplazada' : 'expirada');
            }
            return throwError(() => err);
        })
    );
};
