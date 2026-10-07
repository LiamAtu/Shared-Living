import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, checkmark, closeOutline, settingsOutline } from 'ionicons/icons';
import { House, ShoppingItem, SupabaseService } from '../supabase.service';
import { timeAgo } from '../util';

@Component({
  selector: 'app-shopping',
  imports: [
    FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList,
    IonItem, IonLabel, IonInput, IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div slot="start" class="sl-brand"><img src="icons/icon-96x96.png" alt="" /></div>
        <ion-title>Shopping</ion-title>
        <ion-buttons slot="end">
          <ion-button routerLink="/settings" aria-label="Settings">
            <ion-icon slot="icon-only" name="settings-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <div class="sl-page">
        <p class="intro">Out of something? Add it here. If you're at the shops and free, grab it and tick it off.</p>

        <div class="sl-card">
          <form class="add" (ngSubmit)="addItem()">
            <ion-input
              fill="outline" placeholder="Add an item, e.g. Milk"
              [(ngModel)]="newItem" name="item" maxlength="80" aria-label="New shopping item" />
            <ion-button class="pill" type="submit" [disabled]="!newItem.trim()" aria-label="Add item">
              <ion-icon slot="icon-only" name="add" />
            </ion-button>
          </form>
        </div>

        <!-- ===== Needed ===== -->
        <div class="sl-section"><h2>Needed@if (needed().length) {<span class="count">{{ needed().length }}</span>}</h2></div>
        <div class="sl-card">
          @if (needed().length) {
            <ion-list lines="full">
              @for (i of needed(); track i.id) {
                <ion-item>
                  <button slot="start" class="tick" (click)="toggle(i)" [attr.aria-label]="'Got ' + i.name"></button>
                  <ion-label class="ion-text-wrap">
                    <h3>{{ i.name }}</h3>
                    <p>Added by {{ i.added_by_name }} · {{ ago(i.created_at) }}</p>
                  </ion-label>
                  <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="remove(i)" aria-label="Remove">
                    <ion-icon slot="icon-only" name="close-outline" />
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          } @else {
            <div class="sl-empty">Nothing needed right now.</div>
          }
        </div>

        <!-- ===== Got it ===== -->
        @if (bought().length) {
          <div class="sl-section">
            <h2>Got it<span class="count">{{ bought().length }}</span></h2>
            <ion-button fill="clear" size="small" color="medium" (click)="clearBought()">Clear</ion-button>
          </div>
          <div class="sl-card">
            <ion-list lines="full">
              @for (i of bought(); track i.id) {
                <ion-item class="done">
                  <button slot="start" class="tick on" (click)="toggle(i)" [attr.aria-label]="'Still need ' + i.name">
                    <ion-icon name="checkmark" />
                  </button>
                  <ion-label class="ion-text-wrap">
                    <h3>{{ i.name }}</h3>
                    <p>{{ i.bought_by_name ?? 'Someone' }} got it · {{ ago(i.bought_at ?? i.created_at) }}</p>
                  </ion-label>
                </ion-item>
              }
            </ion-list>
          </div>
          <p class="foot">Ticked items clear themselves after a week.</p>
        }
      </div>
    </ion-content>
  `,
  styles: `
    .intro { color: var(--sl-muted); font-weight: 600; margin: 4px 4px 14px; line-height: 1.4; }
    .add { display: flex; gap: 8px; align-items: center; padding: 14px; }
    .add ion-input { --border-radius: 14px; font-weight: 600; flex: 1; min-height: 44px; }
    .add .pill { --padding-start: 12px; --padding-end: 12px; height: 44px; margin: 0; }

    .tick {
      width: 30px; height: 30px; border-radius: 50%; margin: 0 14px 0 4px; flex-shrink: 0;
      border: 2.5px solid var(--sl-muted); background: transparent; cursor: pointer;
      display: grid; place-items: center; color: var(--sl-glyph); font-size: 18px; padding: 0;
    }
    .tick.on { background: var(--sl-mint); border-color: var(--sl-mint); }
    .tick:active { transform: scale(0.92); }
    ion-item.done h3 { text-decoration: line-through; color: var(--sl-muted); }
    .icon-btn { --padding-start: 6px; --padding-end: 6px; margin: 0; }
    .foot { text-align: center; color: var(--sl-muted); font-size: 0.82rem; margin-top: 10px; }
  `,
})
export class ShoppingPage implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastController);

  readonly house = signal<House | null>(null);
  readonly items = signal<ShoppingItem[]>([]);
  readonly needed = computed(() => this.items().filter((i) => !i.bought));
  readonly bought = computed(() =>
    this.items()
      .filter((i) => i.bought)
      .sort((a, b) => (b.bought_at ?? '').localeCompare(a.bought_at ?? '')),
  );
  newItem = '';

  private stopWatching?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ add, checkmark, closeOutline, settingsOutline });
  }

  async ngOnInit() {
    const h = await this.supabase.getMyHouse();
    this.house.set(h);
    if (!h) return;
    await this.load();
    this.stopWatching = this.supabase.watchTables(h.id, ['shopping_items'], () => {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.load(), 250);
    });
  }

  ngOnDestroy() {
    this.stopWatching?.();
    clearTimeout(this.reloadTimer);
  }

  async load() {
    const h = this.house();
    if (!h) return;
    try {
      this.items.set(await this.supabase.getShopping(h.id));
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load the list.');
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async addItem() {
    const h = this.house();
    const name = this.newItem.trim();
    if (!h || !name) return;
    this.newItem = '';
    await this.run(() => this.supabase.addShoppingItem(h.id, name));
  }

  async toggle(i: ShoppingItem) {
    // Update straight away so it feels instant, then save
    this.items.set(
      this.items().map((x) =>
        x.id === i.id ? { ...x, bought: !i.bought, bought_at: !i.bought ? new Date().toISOString() : null } : x,
      ),
    );
    await this.run(() => this.supabase.setBought(i.id, !i.bought));
  }

  remove(i: ShoppingItem) {
    this.items.set(this.items().filter((x) => x.id !== i.id));
    return this.run(() => this.supabase.removeShoppingItem(i.id));
  }

  clearBought() {
    const h = this.house();
    if (!h) return;
    return this.run(() => this.supabase.clearBought(h.id));
  }

  ago(iso: string) {
    return timeAgo(iso);
  }

  private async run(action: () => Promise<void>) {
    try {
      await action();
    } catch (e: any) {
      this.show(e?.message ?? 'Something went wrong.');
    }
    await this.load();
  }

  private async show(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}
