/*
    Author: German Valencia
    Rutas de Porttos móvil. El tablero, alertas, asistente y ajustes viven dentro del armazón
    (encabezado + pestañas + barra inferior en el teléfono).
*/
import { Routes } from '@angular/router';
import { conSesion, sinSesion } from './core/sesion.guard';

export const rutas: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'app/tablero' },
    {
        path: 'login',
        canActivate: [sinSesion],
        loadComponent: () => import('./paginas/login/login.page').then((m) => m.LoginPage)
    },
    {
        path: 'app',
        canActivate: [conSesion],
        loadComponent: () => import('./paginas/armazon/armazon.component').then((m) => m.ArmazonComponent),
        children: [
            { path: '', pathMatch: 'full', redirectTo: 'tablero' },
            { path: 'tablero', loadComponent: () => import('./paginas/tablero/tablero.page').then((m) => m.TableroPage) },
            { path: 'alertas', loadComponent: () => import('./paginas/alertas/alertas.page').then((m) => m.AlertasPage) },
            { path: 'asistente', loadComponent: () => import('./paginas/asistente/asistente.page').then((m) => m.AsistentePage) },
            { path: 'ajustes', loadComponent: () => import('./paginas/ajustes/ajustes.page').then((m) => m.AjustesPage) }
        ]
    },
    { path: '**', redirectTo: 'app/tablero' }
];
