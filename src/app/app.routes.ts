import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';

export const routes: Routes = [
  { path: 'login', title: 'Entrar | Txila', loadComponent: () => import('./features/auth/login').then(m => m.Login) },
  { path: 'reset-password', title: 'Nova palavra-passe | Txila', loadComponent: () => import('./features/auth/reset-password').then(m => m.ResetPassword) },
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () => import('./layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      { path: 'dashboard', title: 'Dashboard | Txila', loadComponent: () => import('./features/dashboard/dashboard').then(m => m.Dashboard) },
      { path: 'produtos', title: 'Produtos | Txila', loadComponent: () => import('./features/products/products').then(m => m.Products) },
      { path: 'categorias', title: 'Categorias | Txila', loadComponent: () => import('./features/categories/categories').then(m => m.Categories) },
      { path: 'estabelecimentos', title: 'Estabelecimentos | Txila', loadComponent: () => import('./features/establishments/establishments').then(m => m.Establishments) },
      { path: 'utilizadores', title: 'Utilizadores | Txila', loadComponent: () => import('./features/users/users').then(m => m.Users) },
      { path: 'auditoria', title: 'Auditoria | Txila', loadComponent: () => import('./features/audit/audit').then(m => m.Audit) },
    ]
  },
  { path: '**', redirectTo: '' }
];
