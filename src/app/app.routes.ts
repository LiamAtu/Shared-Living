import { Routes } from '@angular/router';
import { authGuard, guestGuard, houseGuard } from './guards';

export const routes: Routes = [
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
    path: 'settings',
    canActivate: [houseGuard],
    loadComponent: () => import('./pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    // Opened from the 9am notification
    path: 'plan',
    canActivate: [houseGuard],
    loadComponent: () => import('./pages/plan.page').then((m) => m.PlanPage),
  },
  {
    // The four tabs: /home, /dinner, /shopping, /history
    path: '',
    canActivate: [houseGuard],
    loadComponent: () => import('./pages/tabs.page').then((m) => m.TabsPage),
    children: [
      { path: 'home', loadComponent: () => import('./pages/home.page').then((m) => m.HomePage) },
      { path: 'dinner', loadComponent: () => import('./pages/dinner.page').then((m) => m.DinnerPage) },
      { path: 'shopping', loadComponent: () => import('./pages/shopping.page').then((m) => m.ShoppingPage) },
      { path: 'history', loadComponent: () => import('./pages/history.page').then((m) => m.HistoryPage) },
      { path: '', redirectTo: 'home', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'home' },
];
