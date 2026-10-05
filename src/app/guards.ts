import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase.service';

/** Only let logged-in users through; everyone else goes to /login. */
export const authGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  return (await supabase.getSession()) ? true : router.createUrlTree(['/login']);
};

/** Only let users who are in a house through; others go to /setup. */
export const houseGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  if (!(await supabase.getSession())) return router.createUrlTree(['/login']);
  return (await supabase.getMyHouse()) ? true : router.createUrlTree(['/setup']);
};

/** Keep logged-in users off the login page. */
export const guestGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const router = inject(Router);
  return (await supabase.getSession()) ? router.createUrlTree(['/home']) : true;
};
