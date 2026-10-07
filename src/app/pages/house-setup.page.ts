import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { homeOutline, peopleOutline } from 'ionicons/icons';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-house-setup',
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonButton, IonContent, IonInput, IonIcon,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="end">
          <ion-button (click)="signOut()">Log out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="sl-page">
        <div class="intro">
          <img src="icons/icon-96x96.png" alt="" />
          <h1>Find your house</h1>
          <p>Join your housemates with their invite code, or start a new house.</p>
        </div>

        <div class="sl-card box">
          <div class="box-head">
            <div class="sl-tile mint"><ion-icon name="people-outline" /></div>
            <div>
              <h2>Join a house</h2>
              <p>Got an invite code from a housemate?</p>
            </div>
          </div>
          <ion-input
            label="Invite code" labelPlacement="stacked" fill="outline"
            placeholder="e.g. 3f9a1c2b" [(ngModel)]="code" name="code" class="mono" />
          <ion-button class="pill" expand="block" (click)="join()" [disabled]="busy() || !code.trim()">
            Join house
          </ion-button>
        </div>

        <div class="or"><span>or</span></div>

        <div class="sl-card box">
          <div class="box-head">
            <div class="sl-tile butter"><ion-icon name="home-outline" /></div>
            <div>
              <h2>Start a new house</h2>
              <p>You'll be the admin and get a code to share.</p>
            </div>
          </div>
          <ion-input
            label="House name" labelPlacement="stacked" fill="outline"
            placeholder="e.g. 12 Main Street" [(ngModel)]="houseName" name="houseName" />
          <ion-input
            label="Monthly rent (€)" labelPlacement="stacked" fill="outline" type="number"
            [(ngModel)]="rent" name="rent" />
          <ion-button class="pill" expand="block" fill="outline" (click)="create()"
            [disabled]="busy() || !houseName.trim()">
            Create house
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .intro { text-align: center; margin: 0 0 20px; }
    .intro img { width: 64px; height: 64px; border-radius: 18px; box-shadow: var(--sl-shadow); }
    .intro h1 { font-weight: 900; font-size: 1.6rem; margin: 12px 0 4px; }
    .intro p { color: var(--sl-muted); margin: 0; font-weight: 600; }
    .box { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
    .box-head { display: flex; align-items: center; }
    .box-head h2 { margin: 0; font-size: 1.1rem; font-weight: 800; }
    .box-head p { margin: 2px 0 0; color: var(--sl-muted); font-size: 0.88rem; }
    ion-input { --border-radius: 14px; font-weight: 600; }
    ion-input.mono { font-family: ui-monospace, Menlo, monospace; letter-spacing: 0.12em; }
    .pill { height: 46px; }
    .or { display: flex; align-items: center; gap: 12px; margin: 18px 8px; color: var(--sl-muted); font-weight: 700; }
    .or::before, .or::after { content: ''; flex: 1; height: 1px; background: var(--sl-border); }
  `,
})
export class HouseSetupPage {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastController);

  readonly busy = signal(false);
  code = '';
  houseName = '';
  rent = 150;

  constructor() {
    addIcons({ homeOutline, peopleOutline });
  }

  join() {
    return this.run(() => this.supabase.joinHouse(this.code));
  }

  create() {
    return this.run(() => this.supabase.createHouse(this.houseName.trim(), Number(this.rent) || 0));
  }

  async signOut() {
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  private async run(action: () => Promise<unknown>) {
    this.busy.set(true);
    try {
      await action();
      await this.router.navigateByUrl('/home', { replaceUrl: true });
    } catch (e: any) {
      const t = await this.toast.create({
        message: e?.message ?? 'Something went wrong.',
        duration: 3500,
        position: 'top',
      });
      await t.present();
    } finally {
      this.busy.set(false);
    }
  }
}
