import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  ToastController,
} from '@ionic/angular';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    IonContent, IonSegment, IonSegmentButton, IonLabel, IonInput, IonButton, IonSpinner,
  ],
  template: `
    <ion-content>
      <div class="wrap">
        <img class="logo" src="icons/logo.png" alt="Shared Living" />
        <h1>Shared Living</h1>
        <p class="tag">Log your chores, earn credits, and keep your rent down.</p>

        <div class="sl-card form-card">
          <ion-segment mode="ios" [value]="mode()" (ionChange)="mode.set($any($event.detail.value))">
            <ion-segment-button value="login"><ion-label>Log in</ion-label></ion-segment-button>
            <ion-segment-button value="signup"><ion-label>Sign up</ion-label></ion-segment-button>
          </ion-segment>

          <form (ngSubmit)="submit()">
            @if (mode() === 'signup') {
              <ion-input
                label="Your name" labelPlacement="stacked" fill="outline"
                name="name" [(ngModel)]="name" autocomplete="name" required />
            }
            <ion-input
              label="Email" labelPlacement="stacked" fill="outline" type="email"
              name="email" [(ngModel)]="email" autocomplete="email" required />
            <ion-input
              label="Password" labelPlacement="stacked" fill="outline" type="password"
              name="password" [(ngModel)]="password"
              [autocomplete]="mode() === 'signup' ? 'new-password' : 'current-password'"
              [helperText]="mode() === 'signup' ? 'At least 6 characters' : ''" required />

            <ion-button class="pill big" expand="block" type="submit" [disabled]="busy()">
              @if (busy()) { <ion-spinner name="crescent" /> }
              @else { {{ mode() === 'login' ? 'Log in' : 'Create account' }} }
            </ion-button>
          </form>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 420px; margin: 0 auto; padding: calc(28px + env(safe-area-inset-top)) 20px 32px; text-align: center; }
    .logo { width: 104px; height: 104px; border-radius: 28px; box-shadow: var(--sl-shadow); }
    h1 { font-weight: 900; font-size: 1.9rem; margin: 16px 0 4px; letter-spacing: -0.02em; }
    .tag { color: var(--sl-muted); margin: 0 0 24px; font-weight: 600; }
    .form-card { padding: 16px; text-align: left; }
    form { display: flex; flex-direction: column; gap: 14px; margin-top: 16px; }
    ion-input { --border-radius: 14px; --highlight-color-focused: var(--ion-color-primary); font-weight: 600; }
    .pill.big { height: 48px; font-size: 1rem; margin-top: 6px; }
  `,
})
export class LoginPage {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastController);

  readonly mode = signal<'login' | 'signup'>('login');
  readonly busy = signal(false);
  name = '';
  email = '';
  password = '';

  async submit() {
    if (!this.email || !this.password || (this.mode() === 'signup' && !this.name.trim())) {
      return this.show('Please fill in every field.');
    }
    this.busy.set(true);
    try {
      if (this.mode() === 'login') {
        await this.supabase.signIn(this.email, this.password);
        await this.router.navigateByUrl('/home', { replaceUrl: true });
      } else {
        const loggedIn = await this.supabase.signUp(this.email, this.password, this.name.trim());
        if (loggedIn) {
          await this.router.navigateByUrl('/setup', { replaceUrl: true });
        } else {
          this.mode.set('login');
          this.show('Check your email to confirm your account, then log in.');
        }
      }
    } catch (e: any) {
      this.show(e?.message ?? 'Something went wrong.');
    } finally {
      this.busy.set(false);
    }
  }

  private async show(message: string) {
    const t = await this.toast.create({ message, duration: 3500, position: 'top' });
    await t.present();
  }
}
