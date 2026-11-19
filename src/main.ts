import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { applyStoredTheme } from './app/core/services/theme.service';

// O modo claro/escuro escolhido aplica-se antes do primeiro desenho, sem piscar.
applyStoredTheme();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
