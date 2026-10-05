import { Routes } from '@angular/router';
import { authGuard, guestGuard, houseGuard } from './guards';

export const routes: Routes = [
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'setup',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/house-setup.page').then((m) => m.HouseSetupPage),
  },
  {
    path: 'home',
    canActivate: [houseGuard],
    loadComponent: () => import('./pages/home.page').then((m) => m.HomePage),
  },
  { path: '**', redirectTo: 'home' },
];
