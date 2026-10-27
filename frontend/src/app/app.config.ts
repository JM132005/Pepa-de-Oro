// app.config.ts → configuración global de la aplicación Angular (proveedores).

import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
// provideRouter: navegación entre pantallas. withComponentInputBinding: los :id de la URL llegan como input().
// withInMemoryScrolling: al cambiar de página vuelve arriba (como un sitio web normal).
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
// registerLocaleData: carga el formato de números y fechas de Ecuador para los pipes de Angular.
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es-EC';
import { routes } from './app.routes';
import { tokenInterceptor } from './compartido/Controlador/token.interceptor';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top', anchorScrolling: 'enabled' })),
    provideHttpClient(withInterceptors([tokenInterceptor])),
    { provide: LOCALE_ID, useValue: 'es-EC' },
  ],
};
