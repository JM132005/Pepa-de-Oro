// main.ts → punto de entrada del frontend: arranca la aplicación Angular con su configuración.

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// bootstrapApplication: crea el componente raíz <app-root> y lo dibuja en index.html.
bootstrapApplication(App, appConfig).catch((err) => console.error(err));
