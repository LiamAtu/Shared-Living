import { Component } from '@angular/core';
import { IonIcon, IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  calendar,
  calendarOutline,
  cart,
  cartOutline,
  checkmarkDoneCircle,
  checkmarkDoneCircleOutline,
  restaurant,
  restaurantOutline,
} from 'ionicons/icons';

/** Bottom tab bar: Chores, Dinner, Shopping, History. */
@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel],
  template: `
    <ion-tabs (ionTabsDidChange)="current = $event.tab">
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home">
          <ion-icon [name]="current === 'home' ? 'checkmark-done-circle' : 'checkmark-done-circle-outline'" />
          <ion-label>Chores</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="dinner">
          <ion-icon [name]="current === 'dinner' ? 'restaurant' : 'restaurant-outline'" />
          <ion-label>Dinner</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="shopping">
          <ion-icon [name]="current === 'shopping' ? 'cart' : 'cart-outline'" />
          <ion-label>Shopping</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="history">
          <ion-icon [name]="current === 'history' ? 'calendar' : 'calendar-outline'" />
          <ion-label>History</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: `
    ion-tab-bar {
      --background: var(--sl-surface);
      --border: 1px solid var(--sl-border);
      --color: var(--sl-muted);
      --color-selected: var(--sl-text);
      height: 58px;
      padding-bottom: env(safe-area-inset-bottom);
      box-sizing: content-box;
    }
    ion-tab-button { --ripple-color: transparent; font-weight: 800; }
    ion-tab-button ion-icon { font-size: 24px; }
    ion-tab-button ion-label { font-size: 0.72rem; margin-top: 2px; }
  `,
})
export class TabsPage {
  current = 'home';

  constructor() {
    addIcons({
      calendar, calendarOutline, cart, cartOutline, checkmarkDoneCircle,
      checkmarkDoneCircleOutline, restaurant, restaurantOutline,
    });
  }
}
