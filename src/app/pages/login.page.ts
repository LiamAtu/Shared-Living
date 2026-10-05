import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonInput,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-login',
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonContent, IonSegment, IonSegmentButton,
    IonLabel, IonInput, IonButton, IonSpinner, IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Shared Living</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="wrap">
        <h1>{{ mode() === 'login' ? 'Welcome back' : 'Create your account' }}</h1>
        <ion-text color="medium">
          <p>Log your chores, earn credits, and keep your rent down.</p>
        </ion-text>

        <ion-segment [value]="mode()" (ionChange)="mode.set($any($event.detail.value))">
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
            helperText="At least 6 characters" required />

          <ion-button expand="block" type="submit" [disabled]="busy()">
            @if (busy()) { <ion-spinner name="crescent" /> }
            @else { {{ mode() === 'login' ? 'Log in' : 'Sign up' }} }
          </ion-button>
        </form>
      </div>
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 420px; margin: 0 auto; padding-top: 24px; }
    h1 { font-weight: 700; margin-bottom: 4px; }
    ion-segment { margin: 24px 0 16px; }
    form { display: flex; flex-direction: column; gap: 14px; }
    ion-button { margin-top: 8px; }
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
