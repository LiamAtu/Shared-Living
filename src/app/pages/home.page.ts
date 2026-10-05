import { Component, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
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
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { House, SupabaseService } from '../supabase.service';

@Component({
  selector: 'app-home',
  imports: [
    CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
    IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ house()?.name ?? 'Shared Living' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="signOut()">Log out</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (house(); as h) {
        <div class="wrap">
          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Invite your housemates</ion-card-subtitle>
              <ion-card-title class="code">{{ h.invite_code }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p>They sign up, tap <strong>Join a house</strong>, and enter this code.</p>
              <ion-button fill="outline" (click)="copyCode(h.invite_code)">Copy code</ion-button>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-subtitle>Monthly rent</ion-card-subtitle>
              <ion-card-title>{{ h.monthly_rent | currency: h.currency }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              Chores and credits are coming next.
            </ion-card-content>
          </ion-card>
        </div>
      }
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 480px; margin: 0 auto; }
    .code { font-family: ui-monospace, monospace; letter-spacing: 0.15em; font-size: 2rem; }
  `,
})
export class HomePage implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastController);

  readonly house = signal<House | null>(null);

  async ngOnInit() {
    this.house.set(await this.supabase.getMyHouse());
  }

  async copyCode(code: string) {
    await navigator.clipboard?.writeText(code);
    const t = await this.toast.create({ message: 'Invite code copied', duration: 1500 });
    await t.present();
  }

  async signOut() {
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
