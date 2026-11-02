/*
    Author: German Valencia
    Arranque de Porttos móvil.
*/
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { RaizComponent } from './app/app.component';

bootstrapApplication(RaizComponent, appConfig).catch((err) => console.error(err));
