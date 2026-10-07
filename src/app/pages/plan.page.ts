import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { BoardChore, SupabaseService } from '../supabase.service';
import { choreIcon, Tone } from '../chore-icons';

/** "Pick your chores for today" – opened from the 9am notification. */
@Component({
  selector: 'app-plan',
  imports: [
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent, IonFooter,
    IonList, IonItem, IonLabel, IonIcon, IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button defaultHref="/home" text="" /></ion-buttons>
        <ion-title>Plan your day</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="sl-page">
        <div class="hello">
          <h1>{{ greeting() }}{{ name() ? ', ' + name() : '' }}</h1>
          <p>Tick the chores you'll do today. Daily ones are due by midnight, weekly ones by Sunday.</p>
        </div>

        @if (loading()) {
          <div class="loading"><ion-spinner name="crescent" /></div>
        } @else {
          @if (mine().length) {
            <div class="sl-section"><h2>Already on your list</h2></div>
            <div class="sl-card">
              <ion-list lines="full">
                @for (c of mine(); track c.chore_id) {
                  <ion-item>
                    <div [class]="'sl-tile sm ' + icon(c.name).tone" slot="start"><ion-icon [name]="icon(c.name).icon" /></div>
                    <ion-label><h3>{{ c.name }}</h3><p>{{ c.frequency === 'daily' ? 'Today' : 'By Sunday' }} · {{ c.credit_value }} credits</p></ion-label>
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          @for (group of groups(); track group.title) {
            @if (group.items.length) {
              <div class="sl-section"><h2>{{ group.title }}</h2></div>
              <div class="sl-card">
                <ion-list lines="full">
                  @for (c of group.items; track c.chore_id) {
                    <ion-item button [detail]="false" (click)="toggle(c.chore_id)" [class.picked]="picked().has(c.chore_id)">
                      <div [class]="'sl-tile ' + icon(c.name).tone" slot="start"><ion-icon [name]="icon(c.name).icon" /></div>
                      <ion-label class="ion-text-wrap">
                        <h3>{{ c.name }}</h3>
                        <p>{{ c.credit_value === 1 ? '1 credit' : c.credit_value + ' credits' }}</p>
                      </ion-label>
                      <span slot="end" class="check" [class.on]="picked().has(c.chore_id)">
                        @if (picked().has(c.chore_id)) { <ion-icon name="checkmark" /> }
                      </span>
                    </ion-item>
                  }
                </ion-list>
              </div>
            }
          }

          @if (!available().length) {
            <div class="sl-card"><div class="sl-empty">Nothing left to pick right now. Everything's taken, done, or resting.</div></div>
          }
        }
      </div>
    </ion-content>

    <ion-footer class="ion-no-border">
      <div class="bar">
        <ion-button class="pill big" expand="block" [disabled]="!picked().size || saving()" (click)="save()">
          @if (saving()) { <ion-spinner name="crescent" /> }
          @else if (picked().size) { Add {{ picked().size }} to my list · +{{ pickedCredits() }} {{ pickedCredits() === 1 ? 'credit' : 'credits' }} }
          @else { Pick some chores }
        </ion-button>
      </div>
    </ion-footer>
  `,
  styles: `
    .hello h1 { font-weight: 900; font-size: 1.6rem; margin: 6px 4px 4px; }
    .hello p { color: var(--sl-muted); font-weight: 600; margin: 0 4px; line-height: 1.4; }
    .loading { display: grid; place-items: center; padding: 40px; }
    .check {
      width: 28px; height: 28px; border-radius: 50%; border: 2.5px solid var(--sl-muted);
      display: grid; place-items: center; color: var(--ion-color-primary-contrast); font-size: 18px;
    }
    .check.on { background: var(--ion-color-primary); border-color: var(--ion-color-primary); }
    ion-item.picked { --background: var(--sl-surface-2); }
    .bar { padding: 10px 16px calc(10px + env(safe-area-inset-bottom)); background: var(--sl-bg); max-width: 560px; margin: 0 auto; }
    .pill.big { height: 50px; font-size: 1rem; }
  `,
})
export class PlanPage implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastController);

  readonly board = signal<BoardChore[]>([]);
  readonly picked = signal(new Set<string>());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly name = signal('');

  readonly mine = computed(() => this.board().filter((c) => c.state === 'mine'));
  readonly available = computed(() => this.board().filter((c) => c.state === 'available'));
  readonly groups = computed(() => [
    { title: 'Daily chores', items: this.available().filter((c) => c.frequency === 'daily') },
    { title: 'Weekly chores', items: this.available().filter((c) => c.frequency === 'weekly') },
  ]);
  readonly pickedCredits = computed(() =>
    this.available().filter((c) => this.picked().has(c.chore_id)).reduce((s, c) => s + c.credit_value, 0),
  );

  private iconCache = new Map<string, { icon: string; tone: Tone }>();

  constructor() {
    addIcons({ checkmark });
  }

  async ngOnInit() {
    try {
      const [board, name] = await Promise.all([this.supabase.getBoard(), this.supabase.getMyName()]);
      this.board.set(board);
      this.name.set(name.split(' ')[0]);
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load chores.');
    } finally {
      this.loading.set(false);
    }
  }

  greeting() {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  }

  toggle(id: string) {
    const next = new Set(this.picked());
    next.has(id) ? next.delete(id) : next.add(id);
    this.picked.set(next);
  }

  async save() {
    this.saving.set(true);
    const chosen = this.available().filter((c) => this.picked().has(c.chore_id));
    const failed: string[] = [];
    for (const c of chosen) {
      try {
        await this.supabase.claimChore(c.chore_id);
      } catch (e: any) {
        failed.push(`${c.name}: ${e?.message ?? 'not available'}`);
      }
    }
    this.saving.set(false);
    const added = chosen.length - failed.length;
    if (failed.length) {
      this.show(`Added ${added}. Couldn't add ${failed.join('; ')}`, 5000);
    } else {
      this.show(`Added ${added} chore${added === 1 ? '' : 's'} to your list. Go get 'em!`);
    }
    await this.router.navigateByUrl('/home', { replaceUrl: true });
  }

  icon(name: string) {
    let v = this.iconCache.get(name);
    if (!v) {
      v = choreIcon(name);
      this.iconCache.set(name, v);
    }
    return v;
  }

  private async show(message: string, duration = 2500) {
    const t = await this.toast.create({ message, duration, position: 'top' });
    await t.present();
  }
}
