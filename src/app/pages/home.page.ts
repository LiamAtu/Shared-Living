import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
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
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  add,
  arrowUndoOutline,
  checkmark,
  close,
  settingsOutline,
  trashOutline,
} from 'ionicons/icons';
import {
  BoardChore,
  ChoreLog,
  House,
  Member,
  Statement,
  SupabaseService,
} from '../supabase.service';
import { choreIcon, personTone, Tone } from '../chore-icons';

@Component({
  selector: 'app-home',
  imports: [
    CurrencyPipe, RouterLink,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonList, IonItem,
    IonLabel, IonIcon, IonRefresher, IonRefresherContent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div slot="start" class="brand">
          <img src="icons/icon-96x96.png" alt="" />
        </div>
        <ion-title>{{ house()?.name ?? 'Shared Living' }}</ion-title>
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

      @if (house(); as h) {
        <div class="sl-page">

          <!-- ===== Your month ===== -->
          <div class="hero">
            <div class="hello">Hi {{ myName() }}</div>
            @if (myStatement(); as s) {
              @if (s.credits_remaining > 0) {
                <div class="big red">{{ s.credits_remaining }}</div>
                <div class="caption">credits to go this month</div>
              } @else {
                <div class="big green">0</div>
                <div class="caption">You're living rent free this month</div>
              }
              <div class="bar" [class.done]="s.credits_remaining === 0">
                <div class="fill" [style.width.%]="progress() * 100"></div>
              </div>
              <div class="stats">
                <div class="stat">
                  <span class="v">{{ s.credits_earned }}<small>/{{ s.monthly_credit_target }}</small></span>
                  <span class="k">earned</span>
                </div>
                <div class="stat">
                  <span class="v">{{ myPendingCredits() ? '+' + myPendingCredits() : '0' }}</span>
                  <span class="k">waiting for OK</span>
                </div>
                <div class="stat">
                  <span class="v">{{ s.rent_owed | currency: h.currency : 'symbol' : '1.0-2' }}</span>
                  <span class="k">rent so far</span>
                </div>
              </div>
            } @else {
              <div class="caption">Loading your month…</div>
            }
          </div>

          <!-- ===== Needs your OK ===== -->
          @if (toReview().length) {
            <div class="sl-section"><h2>Needs your OK<span class="count">{{ toReview().length }}</span></h2></div>
            <div class="sl-card">
              <ion-list lines="full">
                @for (l of toReview(); track l.id) {
                  <ion-item>
                    <div [class]="'sl-tile ' + icon(l.chore_name).tone" slot="start">
                      <ion-icon [name]="icon(l.chore_name).icon" />
                    </div>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ l.chore_name }}</h3>
                      <p>{{ l.person_name }} · {{ timeAgo(l.activity_at) }} · +{{ l.credits_awarded }}{{ l.note ? ' · “' + l.note + '”' : '' }}</p>
                    </ion-label>
                    <div slot="end" class="decide">
                      <button class="round no" (click)="review(l, false)" aria-label="Reject"><ion-icon name="close" /></button>
                      <button class="round yes" (click)="review(l, true)" aria-label="Approve"><ion-icon name="checkmark" /></button>
                    </div>
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          <!-- ===== My chores ===== -->
          <div class="sl-section"><h2>My chores@if (mine().length) {<span class="count">{{ mine().length }}</span>}</h2></div>
          <div class="sl-card">
            @if (mine().length) {
              <ion-list lines="full">
                @for (c of mine(); track c.chore_id) {
                  <ion-item>
                    <div [class]="'sl-tile ' + icon(c.name).tone" slot="start">
                      <ion-icon [name]="icon(c.name).icon" />
                    </div>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ c.name }}</h3>
                      <p><span class="due">{{ c.frequency === 'daily' ? 'Today' : 'By Sunday' }}</span> · {{ credits(c.credit_value) }}</p>
                    </ion-label>
                    <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="giveBack(c)" aria-label="Give back">
                      <ion-icon slot="icon-only" name="arrow-undo-outline" />
                    </ion-button>
                    <ion-button slot="end" class="pill" (click)="complete(c)">Done</ion-button>
                  </ion-item>
                }
              </ion-list>
            } @else {
              <div class="sl-empty">Nothing on your list yet. Accept a chore below to start earning.</div>
            }
          </div>

          <!-- ===== Available ===== -->
          <div class="sl-section">
            <h2>Available@if (available().length) {<span class="count">{{ available().length }}</span>}</h2>
            @if (isAdmin()) {
              <div>
                <ion-button fill="clear" size="small" (click)="editing.set(!editing())">{{ editing() ? 'Done' : 'Edit' }}</ion-button>
                <ion-button fill="clear" size="small" (click)="addChore()">
                  <ion-icon slot="start" name="add" /> Add
                </ion-button>
              </div>
            }
          </div>
          <div class="sl-card">
            @if (available().length) {
              <ion-list lines="full">
                @for (c of available(); track c.chore_id) {
                  <ion-item>
                    <div [class]="'sl-tile ' + icon(c.name).tone" slot="start">
                      <ion-icon [name]="icon(c.name).icon" />
                    </div>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ c.name }}</h3>
                      <p>
                        {{ c.frequency === 'daily' ? 'Daily' : 'Weekly' }} · {{ credits(c.credit_value) }}
                        @if (c.max_per_person_month && c.my_count > 0) { · {{ c.my_count }}/{{ c.max_per_person_month }} done }
                      </p>
                    </ion-label>
                    @if (editing()) {
                      <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="removeChore(c)" aria-label="Remove chore">
                        <ion-icon slot="icon-only" name="trash-outline" />
                      </ion-button>
                    }
                    <ion-button slot="end" class="pill" fill="outline" (click)="accept(c)">Accept</ion-button>
                  </ion-item>
                }
              </ion-list>
            } @else {
              <div class="sl-empty">
                @if (board().length) {
                  Nothing to accept right now. Check back later.
                } @else if (isAdmin()) {
                  No chores yet. Tap <strong>Add</strong> to set what each job is worth.
                } @else {
                  No chores yet. Ask the house admin to add some.
                }
              </div>
            }
          </div>

          <!-- ===== Not available ===== -->
          @if (unavailable().length) {
            <div class="sl-section"><h2>Not available right now</h2></div>
            <div class="sl-card">
              <ion-list lines="full">
                @for (c of unavailable(); track c.chore_id) {
                  <ion-item class="quiet">
                    <div [class]="'sl-tile sm faded ' + icon(c.name).tone" slot="start">
                      <ion-icon [name]="icon(c.name).icon" />
                    </div>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ c.name }}</h3>
                      <p>{{ reason(c) }}</p>
                    </ion-label>
                    @if (editing()) {
                      <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="removeChore(c)" aria-label="Remove chore">
                        <ion-icon slot="icon-only" name="trash-outline" />
                      </ion-button>
                    }
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          <!-- ===== House this month ===== -->
          <div class="sl-section">
            <h2>House this month</h2>
            @if (isAdmin()) { <span class="hint">Tap to set targets</span> }
          </div>
          <div class="sl-card">
            <ion-list lines="full">
              @for (row of leaderboard(); track row.user_id) {
                <ion-item [button]="isAdmin()" [detail]="false" (click)="isAdmin() && editTarget(row)">
                  <div [class]="'avatar ' + row.tone" slot="start">{{ row.name.trim()[0]?.toUpperCase() }}</div>
                  <ion-label>
                    <h3>{{ row.name }}{{ row.user_id === myId() ? ' (you)' : '' }}</h3>
                    <div class="mini-bar"><div [style.width.%]="row.pct" [class.done]="row.remaining === 0"></div></div>
                    <p>{{ row.earned }} / {{ row.target }} credits</p>
                  </ion-label>
                  <div slot="end" class="who-end">
                    @if (row.remaining === 0) {
                      <span class="sl-chip approved">Rent free</span>
                    } @else {
                      <span class="owed">{{ row.rent | currency: h.currency : 'symbol' : '1.0-2' }}</span>
                      <span class="togo">{{ row.remaining }} to go</span>
                    }
                  </div>
                </ion-item>
              }
            </ion-list>
          </div>

          <!-- ===== Activity ===== -->
          <div class="sl-section"><h2>Recent activity</h2></div>
          <div class="sl-card">
            @if (logs().length) {
              <ion-list lines="full">
                @for (l of logs(); track l.id) {
                  <ion-item>
                    <div [class]="'sl-tile sm ' + icon(l.chore_name).tone" slot="start">
                      <ion-icon [name]="icon(l.chore_name).icon" />
                    </div>
                    <ion-label class="ion-text-wrap">
                      <h3>{{ l.chore_name }}</h3>
                      <p>{{ l.user_id === myId() ? 'You' : l.person_name }} · {{ timeAgo(l.activity_at) }}{{ l.note ? ' · “' + l.note + '”' : '' }}</p>
                    </ion-label>
                    @if (l.user_id === myId() && l.status === 'pending') {
                      <ion-button slot="end" fill="clear" color="medium" class="icon-btn" (click)="undo(l)" aria-label="Undo">
                        <ion-icon slot="icon-only" name="arrow-undo-outline" />
                      </ion-button>
                    }
                    <span slot="end" [class]="'sl-chip ' + chipClass(l.status)">{{ statusLabel(l) }}</span>
                  </ion-item>
                }
              </ion-list>
            } @else {
              <div class="sl-empty">Nothing done yet this month.</div>
            }
          </div>
        </div>
      }
    </ion-content>
  `,
  styles: `
    .brand { padding-left: 4px; display: flex; }
    .brand img { width: 34px; height: 34px; border-radius: 10px; box-shadow: var(--sl-shadow); }
    ion-title { padding-inline: 10px; font-size: 1.15rem; }

    /* Hero card with the red number */
    .hero {
      margin-top: 6px; padding: 20px 20px 18px; border-radius: 26px; text-align: center;
      background: var(--sl-surface); box-shadow: var(--sl-shadow); position: relative; overflow: hidden;
    }
    .hero::before {
      content: ''; position: absolute; inset: 0 0 auto 0; height: 6px;
      background: linear-gradient(90deg, var(--sl-mint), var(--sl-lavender), var(--sl-butter), var(--sl-peach));
    }
    .hello { font-weight: 800; color: var(--sl-muted); font-size: 0.95rem; margin-top: 4px; }
    .big { font-size: 5rem; font-weight: 900; line-height: 1; letter-spacing: -0.04em; margin-top: 6px; }
    .big.red { color: var(--sl-red); }
    .big.green { color: var(--sl-green); }
    .caption { color: var(--sl-muted); font-weight: 700; margin: 4px 0 16px; }
    .bar { height: 12px; border-radius: 999px; background: var(--sl-surface-2); overflow: hidden; }
    .bar .fill { height: 100%; border-radius: 999px; background: var(--sl-red); transition: width 0.5s ease; min-width: 12px; }
    .bar.done .fill { background: var(--sl-green); }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
    .stat { background: var(--sl-surface-2); border-radius: 16px; padding: 10px 6px; display: flex; flex-direction: column; gap: 2px; }
    .stat .v { font-weight: 900; font-size: 1.15rem; }
    .stat .v small { font-weight: 700; color: var(--sl-muted); font-size: 0.8rem; }
    .stat .k { font-size: 0.72rem; font-weight: 700; color: var(--sl-muted); }

    .sl-section .hint { font-size: 0.8rem; color: var(--sl-muted); font-weight: 700; }
    .due { font-weight: 800; color: var(--sl-text); }
    .icon-btn { --padding-start: 6px; --padding-end: 6px; margin: 0; }
    ion-item .pill { margin-left: 2px; }
    ion-item.quiet h3 { color: var(--sl-muted); }

    .decide { display: flex; gap: 8px; }
    .round {
      width: 40px; height: 40px; border-radius: 50%; border: none; display: grid; place-items: center;
      font-size: 22px; color: var(--sl-glyph); cursor: pointer;
    }
    .round.yes { background: var(--sl-mint); }
    .round.no { background: var(--sl-peach); }
    .round:active { transform: scale(0.94); }

    .avatar {
      width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; margin-right: 12px;
      font-weight: 900; color: var(--sl-glyph); background: var(--sl-surface-2); flex-shrink: 0;
    }
    .avatar.mint { background: var(--sl-mint); }
    .avatar.lavender { background: var(--sl-lavender); }
    .avatar.butter { background: var(--sl-butter); }
    .avatar.peach { background: var(--sl-peach); }
    .avatar.sky { background: var(--sl-sky); }
    .avatar.rose { background: var(--sl-rose); }
    .mini-bar { height: 6px; border-radius: 999px; background: var(--sl-surface-2); overflow: hidden; margin: 6px 0 4px; max-width: 160px; }
    .mini-bar div { height: 100%; background: var(--sl-red); border-radius: 999px; }
    .mini-bar div.done { background: var(--sl-green); }
    .who-end { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .owed { font-weight: 900; }
    .togo { font-size: 0.78rem; font-weight: 800; color: var(--sl-red); }
  `,
})
export class HomePage implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private toast = inject(ToastController);
  private alerts = inject(AlertController);
  private sheets = inject(ActionSheetController);

  readonly house = signal<House | null>(null);
  readonly members = signal<Member[]>([]);
  readonly board = signal<BoardChore[]>([]);
  readonly editing = signal(false);
  readonly logs = signal<ChoreLog[]>([]);
  readonly statements = signal<Statement[]>([]);

  readonly myId = computed(() => this.supabase.session()?.user.id ?? '');
  readonly myName = computed(
    () => this.members().find((m) => m.user_id === this.myId())?.display_name?.split(' ')[0] ?? '',
  );
  readonly isAdmin = computed(
    () => this.members().find((m) => m.user_id === this.myId())?.role === 'admin',
  );
  readonly myStatement = computed(() => this.statements().find((s) => s.user_id === this.myId()));
  readonly progress = computed(() => {
    const s = this.myStatement();
    return s ? Math.min(1, s.credits_earned / Math.max(1, s.monthly_credit_target)) : 0;
  });
  readonly mine = computed(() => this.board().filter((c) => c.state === 'mine'));
  readonly available = computed(() => this.board().filter((c) => c.state === 'available'));
  readonly unavailable = computed(() =>
    this.board().filter((c) => c.state !== 'mine' && c.state !== 'available'),
  );
  readonly toReview = computed(() =>
    this.logs().filter((l) => l.status === 'pending' && l.user_id !== this.myId()),
  );
  readonly myPendingCredits = computed(() =>
    this.logs()
      .filter((l) => l.status === 'pending' && l.user_id === this.myId())
      .reduce((sum, l) => sum + l.credits_awarded, 0),
  );
  readonly leaderboard = computed(() =>
    this.members()
      .map((m) => {
        const s = this.statements().find((x) => x.user_id === m.user_id);
        const earned = s?.credits_earned ?? 0;
        return {
          user_id: m.user_id,
          name: m.display_name,
          tone: personTone(m.user_id) as Tone,
          earned,
          target: m.monthly_credit_target,
          pct: Math.min(100, (earned / Math.max(1, m.monthly_credit_target)) * 100),
          remaining: s?.credits_remaining ?? m.monthly_credit_target,
          rent: s?.rent_owed ?? this.house()?.monthly_rent ?? 0,
        };
      })
      .sort((a, b) => a.remaining - b.remaining),
  );

  private stopWatching?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;
  private iconCache = new Map<string, { icon: string; tone: Tone }>();

  constructor() {
    addIcons({ add, arrowUndoOutline, checkmark, close, settingsOutline, trashOutline });
  }

  async ngOnInit() {
    const house = await this.supabase.getMyHouse();
    this.house.set(house);
    if (!house) return;
    await this.load();
    // Refresh whenever a housemate logs or approves something
    this.stopWatching = this.supabase.watchHouse(house.id, () => this.scheduleReload());
  }

  /** Coming back from Settings: pick up a new name or rent rule. */
  ionViewWillEnter() {
    if (this.house()) this.load();
  }

  ngOnDestroy() {
    this.stopWatching?.();
    clearTimeout(this.reloadTimer);
  }

  async load() {
    const h = this.house();
    if (!h) return;
    try {
      const [house, members, board, logs, statements] = await Promise.all([
        this.supabase.getMyHouse(),
        this.supabase.getMembers(h.id),
        this.supabase.getBoard(),
        this.supabase.getRecentLogs(h.id),
        this.supabase.getStatements(h.id),
      ]);
      if (house) this.house.set(house);
      this.members.set(members);
      this.board.set(board);
      this.logs.set(logs);
      this.statements.set(statements);
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load the house.');
    }
  }

  async refresh(event: CustomEvent) {
    await this.load();
    (event.target as HTMLIonRefresherElement).complete();
  }

  /** Several changes can arrive at once; reload once after they settle. */
  private scheduleReload() {
    clearTimeout(this.reloadTimer);
    this.reloadTimer = setTimeout(() => this.load(), 300);
  }

  // ---------- Actions ----------

  accept(c: BoardChore) {
    const when = c.frequency === 'daily' ? 'today' : 'by Sunday';
    return this.act(() => this.supabase.claimChore(c.chore_id), `${c.name} is on your list. Do it ${when}.`);
  }

  async complete(c: BoardChore) {
    if (!c.log_id) return;
    const logId = c.log_id;
    const alert = await this.alerts.create({
      header: c.name,
      message: `Mark as done for ${this.credits(c.credit_value)}? A housemate will approve it.`,
      inputs: [{ name: 'note', type: 'text', placeholder: 'Add a note (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Done it',
          handler: (values) => {
            this.act(() => this.supabase.completeChore(logId, values?.note), 'Nice one. Waiting for approval.');
          },
        },
      ],
    });
    await alert.present();
  }

  async giveBack(c: BoardChore) {
    if (!c.log_id) return;
    const logId = c.log_id;
    const alert = await this.alerts.create({
      header: `Give back ${c.name}?`,
      message: 'It goes back to Available so someone else can take it.',
      buttons: [
        { text: 'Keep it', role: 'cancel' },
        {
          text: 'Give back',
          role: 'destructive',
          handler: () => {
            this.act(() => this.supabase.releaseChore(logId), `${c.name} is available again`);
          },
        },
      ],
    });
    await alert.present();
  }

  review(log: ChoreLog, approve: boolean) {
    return this.act(
      () => this.supabase.reviewLog(log.id, approve),
      approve ? `Approved ${log.person_name}'s ${log.chore_name}` : 'Rejected',
    );
  }

  undo(log: ChoreLog) {
    return this.act(() => this.supabase.deleteLog(log.id), 'Removed');
  }

  async addChore() {
    const h = this.house();
    if (!h) return;
    const alert = await this.alerts.create({
      header: 'New chore',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'e.g. Clean toilet' },
        { name: 'credits', type: 'number', placeholder: 'Credits, e.g. 15', min: 1 },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Next',
          handler: (v) => {
            const name = (v?.name ?? '').trim();
            const credits = Math.round(Number(v?.credits));
            if (!name || !(credits > 0)) {
              this.show('Give the chore a name and a number of credits.');
              return false;
            }
            this.pickFrequency(h.id, name, credits);
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async pickFrequency(houseId: string, name: string, credits: number) {
    const sheet = await this.sheets.create({
      header: `How often is ${name} done?`,
      buttons: [
        {
          text: 'Daily (do it the day you accept it)',
          handler: () => {
            this.act(() => this.supabase.addChore(houseId, name, credits, 'daily'), `Added ${name}`);
          },
        },
        {
          text: 'Weekly (comes back 5 days after it was done)',
          handler: () => {
            this.act(() => this.supabase.addChore(houseId, name, credits, 'weekly'), `Added ${name}`);
          },
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async removeChore(chore: BoardChore) {
    const alert = await this.alerts.create({
      header: `Remove ${chore.name}?`,
      message: 'Credits already earned for it are kept.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: () => {
            this.act(() => this.supabase.archiveChore(chore.chore_id), `Removed ${chore.name}`);
          },
        },
      ],
    });
    await alert.present();
  }

  async editTarget(row: { user_id: string; name: string; target: number }) {
    const h = this.house();
    if (!h) return;
    const who = row.user_id === this.myId() ? 'your' : `${row.name}'s`;
    const alert = await this.alerts.create({
      header: `Set ${who} monthly target`,
      message: 'Credits needed each month to live rent free.',
      inputs: [{ name: 'target', type: 'number', value: row.target, min: 1 }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (v) => {
            const target = Math.round(Number(v?.target));
            if (!(target > 0)) {
              this.show('Enter a number above 0.');
              return false;
            }
            this.act(
              () => this.supabase.setCreditTarget(h.id, row.user_id, target),
              `Target set to ${target} credits`,
            );
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  // ---------- Helpers ----------

  icon(name: string) {
    let v = this.iconCache.get(name);
    if (!v) {
      v = choreIcon(name);
      this.iconCache.set(name, v);
    }
    return v;
  }

  reason(c: BoardChore): string {
    switch (c.state) {
      case 'taken':
        return `${c.holder_name ?? 'Someone'} is on it`;
      case 'done':
        return `Done today by ${c.holder_name ?? 'someone'}`;
      case 'cooldown':
        return `Back on ${this.formatDate(c.available_from)}`;
      case 'limit':
        return `You've done your ${c.max_per_person_month} this month`;
      default:
        return '';
    }
  }

  private async act(action: () => Promise<void>, success: string) {
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

  chipClass(status: ChoreLog['status']) {
    return status === 'expired' ? 'missed' : status;
  }

  statusLabel(l: ChoreLog): string {
    switch (l.status) {
      case 'approved': return '+' + l.credits_awarded;
      case 'rejected': return 'Rejected';
      case 'expired': return 'Missed';
      default: return 'Waiting';
    }
  }

  credits(n: number): string {
    return n === 1 ? '1 credit' : `${n} credits`;
  }

  formatDate(ymd: string | null): string {
    if (!ymd) return '';
    return new Date(ymd + 'T00:00:00').toLocaleDateString('en-IE', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  }

  timeAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.round(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
  }
}
