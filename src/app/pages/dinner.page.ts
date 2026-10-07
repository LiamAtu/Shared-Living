import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
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
import {
  add,
  bulbOutline,
  chevronBack,
  chevronForward,
  diceOutline,
  restaurantOutline,
  settingsOutline,
  trashOutline,
} from 'ionicons/icons';
import { DinnerDay, House, Suggestion, SupabaseService } from '../supabase.service';
import { addDays, mondayOf, sameDay, shuffle, timeAgo, ymd } from '../util';

interface DayRow {
  date: Date;
  key: string;
  dinner: DinnerDay | null;
  isToday: boolean;
  isPast: boolean;
}

@Component({
  selector: 'app-dinner',
  imports: [
    FormsModule, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList,
    IonItem, IonLabel, IonInput, IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div slot="start" class="sl-brand"><img src="icons/icon-96x96.png" alt="" /></div>
        <ion-title>Dinner</ion-title>
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
        <!-- ===== Week picker ===== -->
        <div class="week-nav">
          <ion-button fill="clear" color="medium" (click)="shiftWeek(-1)" aria-label="Previous week">
            <ion-icon slot="icon-only" name="chevron-back" />
          </ion-button>
          <div class="week-label">
            <div class="wk">{{ weekTitle() }}</div>
            <div class="range">{{ weekRange() }}</div>
          </div>
          <ion-button fill="clear" color="medium" (click)="shiftWeek(1)" aria-label="Next week">
            <ion-icon slot="icon-only" name="chevron-forward" />
          </ion-button>
        </div>

        <!-- ===== Menu ===== -->
        <div class="sl-section">
          <h2>Menu</h2>
          <ion-button fill="clear" size="small" (click)="fillEmpty()" [disabled]="!emptyDays().length">
            <ion-icon slot="start" name="dice-outline" /> Fill empty days
          </ion-button>
        </div>
        <div class="sl-card">
          <ion-list lines="full">
            @for (d of days(); track d.key) {
              <ion-item button [detail]="false" (click)="editDay(d)" [class.past]="d.isPast">
                <div class="date" [class.today]="d.isToday" slot="start">
                  <span class="dow">{{ d.date.toLocaleDateString('en-IE', { weekday: 'short' }) }}</span>
                  <span class="num">{{ d.date.getDate() }}</span>
                </div>
                <ion-label class="ion-text-wrap">
                  @if (d.dinner; as m) {
                    <h3>{{ m.meal }}</h3>
                    <p>{{ m.note ? m.note + ' · ' : '' }}{{ m.by_name ? 'set by ' + m.by_name : '' }}</p>
                  } @else {
                    <h3 class="none">Nothing planned</h3>
                    <p>Tap to add dinner</p>
                  }
                </ion-label>
                @if (d.isToday) { <span slot="end" class="sl-chip neutral">Tonight</span> }
              </ion-item>
            }
          </ion-list>
        </div>

        <!-- ===== Suggestion box ===== -->
        <div class="sl-section"><h2>Suggestion box</h2></div>
        <div class="sl-card">
          <form class="suggest" (ngSubmit)="suggest()">
            <ion-input
              fill="outline" placeholder="Fancy something? e.g. Taco night"
              [(ngModel)]="newSuggestion" name="s" maxlength="80" aria-label="Dinner suggestion" />
            <ion-button class="pill" type="submit" [disabled]="!newSuggestion.trim()" aria-label="Add suggestion">
              <ion-icon slot="icon-only" name="add" />
            </ion-button>
          </form>
          @if (suggestions().length) {
            <ion-list lines="full">
              @for (s of suggestions(); track s.id) {
                <ion-item>
                  <div class="sl-tile sm butter" slot="start"><ion-icon name="bulb-outline" /></div>
                  <ion-label class="ion-text-wrap">
                    <h3>{{ s.meal }}</h3>
                    <p>{{ s.suggested_by === myId() ? 'You' : s.by_name }} · {{ ago(s.created_at) }}</p>
                  </ion-label>
                  <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="removeSuggestion(s)" aria-label="Remove suggestion">
                    <ion-icon slot="icon-only" name="trash-outline" />
                  </ion-button>
                  <ion-button slot="end" class="pill" fill="outline" (click)="planSuggestion(s)">Plan it</ion-button>
                </ion-item>
              }
            </ion-list>
          } @else {
            <div class="sl-empty">No suggestions yet. Add one and anyone can put it on the menu.</div>
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: `
    .week-nav { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
    .week-label { text-align: center; }
    .wk { font-weight: 900; font-size: 1.15rem; }
    .range { color: var(--sl-muted); font-weight: 700; font-size: 0.85rem; }

    .date {
      width: 48px; height: 52px; border-radius: 14px; margin-right: 12px; flex-shrink: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: var(--sl-surface-2); color: var(--sl-text);
    }
    .date .dow { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--sl-muted); }
    .date .num { font-size: 1.2rem; font-weight: 900; line-height: 1.1; }
    .date.today { background: var(--sl-peach); color: var(--sl-glyph); }
    .date.today .dow { color: var(--sl-glyph); }
    h3.none { color: var(--sl-muted); font-weight: 700 !important; }
    ion-item.past { opacity: 0.6; }

    .suggest { display: flex; gap: 8px; align-items: center; padding: 14px 14px 10px; }
    .suggest ion-input { --border-radius: 14px; font-weight: 600; flex: 1; min-height: 44px; }
    .suggest .pill { --padding-start: 12px; --padding-end: 12px; height: 44px; margin: 0; }
    .icon-btn { --padding-start: 6px; --padding-end: 6px; margin: 0; }
  `,
})
export class DinnerPage implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastController);
  private alerts = inject(AlertController);
  private sheets = inject(ActionSheetController);

  readonly house = signal<House | null>(null);
  readonly weekStart = signal(mondayOf(new Date()));
  readonly menu = signal<DinnerDay[]>([]);
  readonly suggestions = signal<Suggestion[]>([]);
  newSuggestion = '';

  readonly myId = computed(() => this.supabase.session()?.user.id ?? '');
  readonly days = computed<DayRow[]>(() => {
    const today = new Date();
    const todayKey = ymd(today);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      const key = ymd(date);
      return {
        date,
        key,
        dinner: this.menu().find((m) => m.day === key) ?? null,
        isToday: sameDay(date, today),
        isPast: key < todayKey,
      };
    });
  });
  readonly emptyDays = computed(() => this.days().filter((d) => !d.dinner && !d.isPast));
  readonly weekTitle = computed(() => {
    const diff = Math.round((this.weekStart().getTime() - mondayOf(new Date()).getTime()) / (7 * 864e5));
    return diff === 0 ? 'This week' : diff === 1 ? 'Next week' : diff === -1 ? 'Last week' : `Week of ${this.fmt(this.weekStart())}`;
  });
  readonly weekRange = computed(() => `${this.fmt(this.weekStart())} – ${this.fmt(addDays(this.weekStart(), 6))}`);

  private stopWatching?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({ add, bulbOutline, chevronBack, chevronForward, diceOutline, restaurantOutline, settingsOutline, trashOutline });
  }

  async ngOnInit() {
    const h = await this.supabase.getMyHouse();
    this.house.set(h);
    if (!h) return;
    await this.load();
    this.stopWatching = this.supabase.watchTables(h.id, ['dinner_menu', 'dinner_suggestions'], () => {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.load(), 300);
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
      const from = ymd(this.weekStart());
      const to = ymd(addDays(this.weekStart(), 6));
      const [menu, suggestions] = await Promise.all([
        this.supabase.getMenu(h.id, from, to),
        this.supabase.getSuggestions(h.id),
      ]);
      this.menu.set(menu);
      this.suggestions.set(suggestions);
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load dinners.');
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  shiftWeek(n: number) {
    this.weekStart.set(addDays(this.weekStart(), n * 7));
    this.menu.set([]);
    this.load();
  }

  // ---------- Menu ----------

  async editDay(d: DayRow) {
    const label = d.date.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'short' });
    const buttons: any[] = [{ text: 'Cancel', role: 'cancel' }];
    if (d.dinner) {
      buttons.push({
        text: 'Clear',
        role: 'destructive',
        handler: () => {
          this.run(() => this.supabase.clearDinner(this.house()!.id, d.key), 'Cleared');
        },
      });
    }
    buttons.push(
      {
        text: 'Surprise me',
        handler: () => {
          this.surprise([d]);
        },
      },
      {
        text: 'Save',
        handler: (v: any) => {
          const meal = (v?.meal ?? '').trim();
          if (!meal) {
            this.show('Type a dinner, or tap Surprise me.');
            return false;
          }
          this.run(() => this.supabase.setDinner(d.key, meal, v?.note), `${meal} on ${d.date.toLocaleDateString('en-IE', { weekday: 'long' })}`);
          return true;
        },
      },
    );
    const alert = await this.alerts.create({
      header: label,
      inputs: [
        { name: 'meal', type: 'text', value: d.dinner?.meal ?? '', placeholder: "What's for dinner?", attributes: { maxlength: 80 } },
        { name: 'note', type: 'text', value: d.dinner?.note ?? '', placeholder: 'Note (optional), e.g. Dino cooking', attributes: { maxlength: 140 } },
      ],
      buttons,
    });
    await alert.present();
  }

  fillEmpty() {
    return this.surprise(this.emptyDays());
  }

  /** Fill the given days with random dinners the house has had or suggested. */
  private async surprise(days: DayRow[]) {
    if (!days.length) return;
    try {
      const pool = await this.dinnerPool();
      if (!pool.length) {
        this.show('No dinners to pick from yet. Plan a few or add suggestions first.');
        return;
      }
      // Avoid repeating what's already on this week's menu where possible
      const onMenu = new Set(this.menu().map((m) => m.meal.toLowerCase()));
      const fresh = shuffle(pool.filter((p) => !onMenu.has(p.toLowerCase())));
      const picks = days.map((_, i) => fresh[i] ?? shuffle(pool)[0]);
      await Promise.all(days.map((d, i) => this.supabase.setDinner(d.key, picks[i])));
      this.show(days.length === 1 ? `How about ${picks[0]}?` : `Filled ${days.length} days`);
      await this.load();
    } catch (e: any) {
      this.show(e?.message ?? 'Could not pick dinners.');
    }
  }

  private async dinnerPool(): Promise<string[]> {
    const past = await this.supabase.pastDinners();
    const seen = new Set<string>();
    const pool: string[] = [];
    for (const m of [...past, ...this.suggestions().map((s) => s.meal)]) {
      const k = m.toLowerCase().trim();
      if (k && !seen.has(k)) {
        seen.add(k);
        pool.push(m.trim());
      }
    }
    return pool;
  }

  // ---------- Suggestions ----------

  suggest() {
    const h = this.house();
    const meal = this.newSuggestion.trim();
    if (!h || !meal) return;
    this.newSuggestion = '';
    return this.run(() => this.supabase.addSuggestion(h.id, meal), 'Added to the suggestion box');
  }

  async planSuggestion(s: Suggestion) {
    const options = this.days().filter((d) => !d.isPast);
    if (!options.length) {
      this.show('This week is over. Go to next week first.');
      return;
    }
    const sheet = await this.sheets.create({
      header: `Which day for ${s.meal}?`,
      buttons: [
        ...options.map((d) => ({
          text:
            d.date.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric' }) +
            (d.dinner ? ` (replaces ${d.dinner.meal})` : ''),
          handler: () => {
            this.run(async () => {
              await this.supabase.setDinner(d.key, s.meal);
              await this.supabase.removeSuggestion(s.id);
            }, `${s.meal} is on the menu`);
          },
        })),
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  removeSuggestion(s: Suggestion) {
    return this.run(() => this.supabase.removeSuggestion(s.id), 'Removed');
  }

  // ---------- Helpers ----------

  ago(iso: string) {
    return timeAgo(iso);
  }

  private fmt(d: Date) {
    return d.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
  }

  private async run(action: () => Promise<void>, success: string) {
    try {
      await action();
      this.show(success);
      await this.load();
    } catch (e: any) {
      this.show(e?.message ?? 'Something went wrong.');
    }
  }

  private async show(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}
