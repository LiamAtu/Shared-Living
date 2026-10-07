import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { settingsOutline } from 'ionicons/icons';
import { HistoryEntry, House, Member, SupabaseService } from '../supabase.service';
import { choreIcon } from '../chore-icons';
import { addDays, mondayOf, sameDay, ymd } from '../util';

interface Slice {
  user_id: string;
  name: string;
  credits: number;
  chores: number;
  pct: number;
  series: number; // 1-8, fixed per person
  dash: string;
  offset: number;
}

interface CalDay {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  isFuture: boolean;
  dots: number[]; // series numbers of people who did something
  count: number;
}

const R = 70; // donut radius
const C = 2 * Math.PI * R;

@Component({
  selector: 'app-history',
  imports: [
    RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonIcon, IonList,
    IonItem, IonLabel, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div slot="start" class="sl-brand"><img src="icons/icon-96x96.png" alt="" /></div>
        <ion-title>History</ion-title>
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
        <ion-segment mode="ios" [value]="which()" (ionChange)="setMonth($any($event.detail.value))">
          <ion-segment-button value="this"><ion-label>{{ monthName(0) }}</ion-label></ion-segment-button>
          <ion-segment-button value="last"><ion-label>{{ monthName(-1) }}</ion-label></ion-segment-button>
        </ion-segment>

        <!-- ===== Pie: who earned what ===== -->
        <div class="sl-section"><h2>Credits earned</h2></div>
        <div class="sl-card chart-card">
          <div class="donut-wrap">
            <svg viewBox="0 0 180 180" class="donut" role="img"
                 [attr.aria-label]="'Credits earned in ' + monthName(which() === 'this' ? 0 : -1) + ': ' + ariaSummary()">
              <circle cx="90" cy="90" [attr.r]="R" class="track" />
              @for (s of slices(); track s.user_id) {
                <circle cx="90" cy="90" [attr.r]="R"
                  class="slice" [class.dim]="focus() && focus() !== s.user_id"
                  [style.stroke]="'var(--series-' + s.series + ')'"
                  [attr.stroke-dasharray]="s.dash" [attr.stroke-dashoffset]="s.offset"
                  (click)="toggleFocus(s.user_id)">
                  <title>{{ s.name }}: {{ s.credits }} credits ({{ s.pct }}%)</title>
                </circle>
              }
            </svg>
            <div class="center">
              <div class="total">{{ focusSlice()?.credits ?? total() }}</div>
              <div class="unit">{{ focusSlice() ? focusSlice()!.name.split(' ')[0] : 'credits' }}</div>
            </div>
          </div>

          @if (slices().length) {
            <div class="legend">
              @for (s of slices(); track s.user_id) {
                <button class="row" [class.on]="focus() === s.user_id" [class.dim]="focus() && focus() !== s.user_id"
                        (click)="toggleFocus(s.user_id)">
                  <span class="swatch" [style.background]="'var(--series-' + s.series + ')'"></span>
                  <span class="nm">{{ s.name }}{{ s.user_id === myId() ? ' (you)' : '' }}</span>
                  <span class="val">{{ s.credits }}</span>
                  <span class="pct">{{ s.pct }}%</span>
                </button>
              }
            </div>
            <p class="hint">Approved credits only. Tap someone to see just their days below.</p>
          } @else {
            <div class="sl-empty center-text">No approved chores {{ which() === 'this' ? 'yet this month' : 'last month' }}.</div>
          }
        </div>

        <!-- ===== Calendar ===== -->
        <div class="sl-section">
          <h2>{{ monthName(which() === 'this' ? 0 : -1) }}{{ focusSlice() ? ' · ' + focusSlice()!.name : '' }}</h2>
          @if (focus()) {
            <ion-button fill="clear" size="small" (click)="focus.set(null)">Show everyone</ion-button>
          }
        </div>
        <div class="sl-card cal-card">
          <div class="cal-head">
            @for (d of ['M','T','W','T','F','S','S']; track $index) { <span>{{ d }}</span> }
          </div>
          <div class="cal-grid">
            @for (d of calendar(); track d.key) {
              <button class="day"
                [class.out]="!d.inMonth" [class.today]="d.isToday" [class.sel]="d.key === selected()"
                [class.has]="d.count > 0" [disabled]="!d.inMonth || d.isFuture"
                (click)="selected.set(d.key)"
                [attr.aria-label]="d.date.toLocaleDateString('en-IE', { day: 'numeric', month: 'long' }) + ': ' + d.count + ' chores'">
                <span class="n">{{ d.date.getDate() }}</span>
                <span class="dots">
                  @for (s of d.dots.slice(0, 4); track $index) {
                    <i [style.background]="'var(--series-' + s + ')'"></i>
                  }
                </span>
              </button>
            }
          </div>
        </div>

        <!-- ===== Selected day ===== -->
        <div class="sl-section"><h2>{{ selectedLabel() }}</h2></div>
        <div class="sl-card">
          @if (dayEntries().length) {
            <ion-list lines="full">
              @for (e of dayEntries(); track e.id) {
                <ion-item>
                  <div [class]="'sl-tile sm ' + icon(e.chore_name).tone" slot="start">
                    <ion-icon [name]="icon(e.chore_name).icon" />
                  </div>
                  <ion-label class="ion-text-wrap">
                    <h3>{{ e.chore_name }}</h3>
                    <p>
                      <span class="who-dot" [style.background]="'var(--series-' + seriesOf(e.user_id) + ')'"></span>
                      {{ e.user_id === myId() ? 'You' : e.person_name }} · {{ time(e.completed_at) }}
                    </p>
                  </ion-label>
                  <span slot="end" [class]="'sl-chip ' + (e.status === 'approved' ? 'approved' : 'pending')">
                    {{ e.status === 'approved' ? '+' + e.credits : 'Waiting' }}
                  </span>
                </ion-item>
              }
            </ion-list>
          } @else {
            <div class="sl-empty">Nothing done this day.</div>
          }
        </div>
        <p class="foot">Only this month and last month are kept. Older history is deleted automatically.</p>
      </div>
    </ion-content>
  `,
  styles: `
    ion-segment { margin-top: 4px; }
    .chart-card { padding: 18px 16px 12px; }
    .donut-wrap { position: relative; width: 190px; height: 190px; margin: 0 auto; }
    .donut { width: 100%; height: 100%; transform: rotate(-90deg); }
    .donut .track { fill: none; stroke: var(--sl-surface-2); stroke-width: 26; }
    .donut .slice { fill: none; stroke-width: 26; cursor: pointer; transition: opacity 0.2s; }
    .donut .slice.dim { opacity: 0.25; }
    .center { position: absolute; inset: 0; display: grid; place-content: center; text-align: center; pointer-events: none; }
    .total { font-size: 2.2rem; font-weight: 900; line-height: 1; }
    .unit { font-size: 0.8rem; font-weight: 800; color: var(--sl-muted); margin-top: 2px; }

    .legend { margin-top: 14px; display: flex; flex-direction: column; gap: 2px; }
    .legend .row {
      display: grid; grid-template-columns: 14px 1fr auto 44px; align-items: center; gap: 10px;
      padding: 8px 6px; border: none; background: transparent; color: var(--sl-text);
      font: inherit; text-align: left; border-radius: 10px; cursor: pointer;
    }
    .legend .row.on { background: var(--sl-surface-2); }
    .legend .row.dim { opacity: 0.5; }
    .swatch { width: 14px; height: 14px; border-radius: 4px; }
    .nm { font-weight: 700; }
    .val { font-weight: 900; }
    .pct { color: var(--sl-muted); font-weight: 700; text-align: right; font-size: 0.88rem; }
    .hint { color: var(--sl-muted); font-size: 0.8rem; text-align: center; margin: 8px 0 4px; }
    .center-text { text-align: center; }

    .cal-card { padding: 12px 10px 10px; }
    .cal-head, .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
    .cal-head span { text-align: center; font-size: 0.72rem; font-weight: 800; color: var(--sl-muted); padding-bottom: 6px; }
    .day {
      aspect-ratio: 1 / 1.05; border: none; border-radius: 12px; background: transparent; color: var(--sl-text);
      font: inherit; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
      cursor: pointer; padding: 0;
    }
    .day .n { font-weight: 800; font-size: 0.95rem; }
    .day.has { background: var(--sl-surface-2); }
    .day.out { visibility: hidden; }
    .day:disabled { cursor: default; }
    .day:disabled .n { color: var(--sl-muted); opacity: 0.5; }
    .day.today .n { color: var(--sl-red); }
    .day.sel { background: var(--ion-color-primary); }
    .day.sel .n { color: var(--ion-color-primary-contrast); }
    .dots { display: flex; gap: 3px; height: 6px; }
    .dots i { width: 6px; height: 6px; border-radius: 50%; box-shadow: 0 0 0 1px var(--sl-surface); }
    .who-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: 1px; }
    .foot { text-align: center; color: var(--sl-muted); font-size: 0.8rem; margin-top: 12px; }
  `,
})
export class HistoryPage implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastController);

  readonly R = R;
  readonly house = signal<House | null>(null);
  readonly members = signal<Member[]>([]);
  readonly entries = signal<HistoryEntry[]>([]);
  readonly which = signal<'this' | 'last'>('this');
  readonly focus = signal<string | null>(null);
  readonly selected = signal(ymd(new Date()));

  readonly myId = computed(() => this.supabase.session()?.user.id ?? '');

  /** Fixed colour slot per person (sorted by id), so a person keeps their colour. */
  private readonly seriesMap = computed(() => {
    const m = new Map<string, number>();
    [...this.members()]
      .sort((a, b) => a.user_id.localeCompare(b.user_id))
      .forEach((p, i) => m.set(p.user_id, (i % 8) + 1));
    return m;
  });

  private readonly monthStart = computed(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + (this.which() === 'this' ? 0 : -1), 1);
  });

  private readonly monthEntries = computed(() => {
    const start = this.monthStart();
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    return this.entries().filter((e) => {
      const t = new Date(e.completed_at);
      return t >= start && t < end;
    });
  });

  readonly total = computed(() =>
    this.monthEntries().filter((e) => e.status === 'approved').reduce((s, e) => s + e.credits, 0),
  );

  readonly slices = computed<Slice[]>(() => {
    const byUser = new Map<string, { credits: number; chores: number; name: string }>();
    for (const e of this.monthEntries()) {
      if (e.status !== 'approved') continue;
      const v = byUser.get(e.user_id) ?? { credits: 0, chores: 0, name: e.person_name };
      v.credits += e.credits;
      v.chores += 1;
      byUser.set(e.user_id, v);
    }
    const total = this.total();
    if (!total) return [];
    const gap = byUser.size > 1 ? 2 : 0; // 2px surface gap between slices
    let acc = 0;
    return [...byUser.entries()]
      .map(([user_id, v]) => ({ user_id, ...v }))
      .sort((a, b) => (this.seriesMap().get(a.user_id) ?? 99) - (this.seriesMap().get(b.user_id) ?? 99))
      .map((v) => {
        const len = (v.credits / total) * C;
        const slice: Slice = {
          user_id: v.user_id,
          name: this.members().find((m) => m.user_id === v.user_id)?.display_name ?? v.name,
          credits: v.credits,
          chores: v.chores,
          pct: Math.round((v.credits / total) * 100),
          series: this.seriesMap().get(v.user_id) ?? 8,
          dash: `${Math.max(0, len - gap)} ${C}`,
          offset: -acc,
        };
        acc += len;
        return slice;
      });
  });

  readonly focusSlice = computed(() => this.slices().find((s) => s.user_id === this.focus()) ?? null);
  readonly ariaSummary = computed(() =>
    this.slices().map((s) => `${s.name} ${s.credits} (${s.pct}%)`).join(', ') || 'none yet',
  );

  readonly calendar = computed<CalDay[]>(() => {
    const start = this.monthStart();
    const month = start.getMonth();
    const first = mondayOf(start);
    const last = new Date(start.getFullYear(), month + 1, 0);
    const days: CalDay[] = [];
    const today = new Date();
    const byDay = new Map<string, HistoryEntry[]>();
    for (const e of this.visibleEntries()) {
      const k = ymd(new Date(e.completed_at));
      byDay.set(k, [...(byDay.get(k) ?? []), e]);
    }
    for (let d = first; d <= last || d.getDay() !== 1; d = addDays(d, 1)) {
      const key = ymd(d);
      const list = byDay.get(key) ?? [];
      days.push({
        date: d,
        key,
        inMonth: d.getMonth() === month,
        isToday: sameDay(d, today),
        isFuture: d > today,
        dots: [...new Set(list.map((e) => this.seriesOf(e.user_id)))].sort((a, b) => a - b),
        count: list.length,
      });
      if (days.length > 42) break;
    }
    return days;
  });

  private readonly visibleEntries = computed(() =>
    this.monthEntries().filter((e) => !this.focus() || e.user_id === this.focus()),
  );

  readonly dayEntries = computed(() =>
    this.visibleEntries()
      .filter((e) => ymd(new Date(e.completed_at)) === this.selected())
      .sort((a, b) => b.completed_at.localeCompare(a.completed_at)),
  );

  readonly selectedLabel = computed(() => {
    const [y, m, d] = this.selected().split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return sameDay(date, new Date())
      ? 'Today'
      : date.toLocaleDateString('en-IE', { weekday: 'long', day: 'numeric', month: 'long' });
  });

  private stopWatching?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private iconCache = new Map<string, { icon: string; tone: string }>();

  constructor() {
    addIcons({ settingsOutline });
  }

  async ngOnInit() {
    const h = await this.supabase.getMyHouse();
    this.house.set(h);
    if (!h) return;
    await this.load();
    this.stopWatching = this.supabase.watchTables(h.id, ['chore_logs'], () => {
      clearTimeout(this.reloadTimer);
      this.reloadTimer = setTimeout(() => this.load(), 400);
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
      const now = new Date();
      const since = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const [members, entries] = await Promise.all([
        this.supabase.getMembers(h.id),
        this.supabase.getHistory(h.id, since),
      ]);
      this.members.set(members);
      this.entries.set(entries);
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load history.');
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  setMonth(which: 'this' | 'last') {
    this.which.set(which);
    this.focus.set(null);
    if (which === 'this') {
      this.selected.set(ymd(new Date()));
    } else {
      // Jump to the last day of last month that has something on it
      const withActivity = this.monthEntries().map((e) => ymd(new Date(e.completed_at))).sort();
      const s = this.monthStart();
      this.selected.set(withActivity.at(-1) ?? ymd(new Date(s.getFullYear(), s.getMonth() + 1, 0)));
    }
  }

  toggleFocus(id: string) {
    this.focus.set(this.focus() === id ? null : id);
  }

  seriesOf(id: string) {
    return this.seriesMap().get(id) ?? 8;
  }

  icon(name: string) {
    let v = this.iconCache.get(name);
    if (!v) {
      v = choreIcon(name);
      this.iconCache.set(name, v);
    }
    return v;
  }

  monthName(offset: number) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + offset, 1).toLocaleDateString('en-IE', { month: 'long' });
  }

  time(iso: string) {
    return new Date(iso).toLocaleTimeString('en-IE', { hour: 'numeric', minute: '2-digit' });
  }

  private async show(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'top' });
    await t.present();
  }
}
