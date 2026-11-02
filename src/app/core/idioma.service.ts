/*
    Author: German Valencia
    Traducciones: los MISMOS es.json / en.json de la web (se copian al compilar desde
    PlataformaIA/src/assets/i18n) más un archivo pequeño con los textos propios del móvil
    (src/assets/i18n-movil). Si una llave existe en ambos, gana la de la web.
*/
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslateService } from '@ngx-translate/core';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';
import { AlmacenService } from './almacen.service';

export const IDIOMAS = ['es', 'en'] as const;
export type Idioma = (typeof IDIOMAS)[number];

function mezclar(base: any, encima: any): any {
    if (!encima || typeof encima !== 'object' || Array.isArray(encima)) return encima ?? base;
    const r: any = { ...(base && typeof base === 'object' ? base : {}) };
    for (const k of Object.keys(encima)) r[k] = mezclar(r[k], encima[k]);
    return r;
}

export class CargadorTraducciones implements TranslateLoader {
    constructor(private http: HttpClient) {}

    getTranslation(lang: string): Observable<any> {
        const leer = (url: string) => this.http.get(url).pipe(catchError(() => of({})));
        return forkJoin([leer(`assets/i18n-movil/${lang}.json`), leer(`assets/i18n/${lang}.json`)]).pipe(
            map(([movil, web]) => mezclar(movil, web))
        );
    }
}

export function crearCargador(http: HttpClient): TranslateLoader {
    return new CargadorTraducciones(http);
}

@Injectable({ providedIn: 'root' })
export class IdiomaService {
    readonly actual = signal<Idioma>('es');

    constructor(private translate: TranslateService, private almacen: AlmacenService) {}

    async iniciar(): Promise<void> {
        this.translate.addLangs([...IDIOMAS]);
        this.translate.setDefaultLang('es');
        const guardado = (await this.almacen.leer('idioma')) as Idioma | null;
        const delEquipo: Idioma = (navigator.language || 'es').toLowerCase().startsWith('en') ? 'en' : 'es';
        await this.usar(guardado && IDIOMAS.includes(guardado) ? guardado : delEquipo, false);
    }

    /** El idioma al que cambia la bandera del encabezado (igual que la web: muestra el opuesto). */
    get opuesto(): Idioma {
        return this.actual() === 'es' ? 'en' : 'es';
    }

    async usar(idioma: Idioma, guardar = true): Promise<void> {
        this.actual.set(idioma);
        document.documentElement.lang = idioma;
        await new Promise<void>((ok) => this.translate.use(idioma).subscribe({ complete: ok, error: () => ok() }));
        if (guardar) await this.almacen.guardar('idioma', idioma);
    }
}
