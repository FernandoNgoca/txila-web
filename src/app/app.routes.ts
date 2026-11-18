import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: 'home', title: 'Txila', loadComponent: () => import('./features/home/home').then(m => m.Home) },
  { path: 'reset-password', title: 'Nova palavra-passe | Txila', loadComponent: () => import('./features/auth/reset-password').then(m => m.ResetPassword) },
  { path: '**', redirectTo: 'home' }
];
