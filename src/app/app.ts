import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ThemeService } from './theme.service';
import { registerChoreIcons } from './chore-icons';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
})
export class App {
  // Starting the theme service applies light/dark and follows the phone's setting
  private theme = inject(ThemeService);

  constructor() {
    registerChoreIcons();
  }
}
