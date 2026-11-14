/*
    Author: German Valencia
    Proveedores de Porttos móvil: rutas, HTTP con el interceptor de sesión y ngx-translate
    con el cargador que mezcla los JSON de la web y los del móvil.
*/
import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { rutas } from './app.routes';
import { sesionInterceptor } from './core/sesion.interceptor';
import { crearCargador, IdiomaService } from './core/idioma.service';
import { TemaService } from './core/tema.service';
import { DispositivoService } from './core/dispositivo.service';
import { SesionService } from './core/sesion.service';

/** Antes del primer pintado: tema, idioma, orientación y sesión guardada. */
function arrancar(tema: TemaService, idioma: IdiomaService, dispositivo: DispositivoService, sesion: SesionService) {
    return () => Promise.all([tema.iniciar(), idioma.iniciar(), dispositivo.iniciar(), sesion.restaurar()]);
}

export const appConfig: ApplicationConfig = {
    providers: [
        provideZoneChangeDetection(), // Angular 21+: sin esto la app quedaría zoneless (OT-035)
        provideRouter(rutas, withComponentInputBinding()),
        provideHttpClient(withInterceptors([sesionInterceptor])),
        importProvidersFrom(
            TranslateModule.forRoot({
                defaultLanguage: 'es',
                loader: { provide: TranslateLoader, useFactory: crearCargador, deps: [HttpClient] }
            })
        ),
        provideAppInitializer(() => arrancar(inject(TemaService), inject(IdiomaService), inject(DispositivoService), inject(SesionService))())
    ]
};
