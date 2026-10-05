import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonInput,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-house-setup',
  imports: [
    FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonInput,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Your house</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="signOut()">Log out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="wrap">
        <ion-card>
          <ion-card-header>
            <ion-card-title>Join a house</ion-card-title>
            <ion-card-subtitle>Got an invite code from a housemate?</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-input
              label="Invite code" labelPlacement="stacked" fill="outline"
              placeholder="e.g. 3f9a1c2b" [(ngModel)]="code" name="code" />
            <ion-button expand="block" (click)="join()" [disabled]="busy() || !code.trim()">
              Join house
            </ion-button>
          </ion-card-content>
        </ion-card>

        <p class="or">or</p>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Start a new house</ion-card-title>
            <ion-card-subtitle>You'll be the admin and get a code to share.</ion-card-subtitle>
          </ion-card-header>
          <ion-card-content>
            <ion-input
              label="House name" labelPlacement="stacked" fill="outline"
              placeholder="e.g. 12 Main Street" [(ngModel)]="houseName" name="houseName" />
            <ion-input
              label="Monthly rent (€)" labelPlacement="stacked" fill="outline" type="number"
              [(ngModel)]="rent" name="rent" />
            <ion-button expand="block" fill="outline" (click)="create()"
              [disabled]="busy() || !houseName.trim()">
              Create house
            </ion-button>
          </ion-card-content>
        </ion-card>
      </div>
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 480px; margin: 0 auto; }
    ion-card-content { display: flex; flex-direction: column; gap: 14px; }
    .or { text-align: center; color: var(--ion-color-medium); margin: 4px 0; }
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
