import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  ActionSheetController,
  AlertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonProgressBar,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  checkmarkOutline,
  closeOutline,
  copyOutline,
  logOutOutline,
  arrowUndoOutline,
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

@Component({
  selector: 'app-home',
  imports: [
    CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent, IonCard,
    IonCardContent, IonList, IonListHeader, IonItem, IonLabel, IonNote, IonBadge,
    IonIcon, IonProgressBar, IonRefresher, IonRefresherContent, IonSegment, IonSegmentButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>{{ house()?.name ?? 'Shared Living' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="signOut()" aria-label="Log out">
            <ion-icon slot="icon-only" name="log-out-outline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      @if (house(); as h) {
        <div class="wrap">

          <!-- ===== Your month ===== -->
          <ion-card class="month">
            <ion-card-content>
              @if (myStatement(); as s) {
                @if (s.credits_remaining > 0) {
                  <div class="red-number">{{ s.credits_remaining }}</div>
                  <div class="caption">credits to go this month</div>
                } @else {
                  <div class="red-number done">0</div>
                  <div class="caption">You're living rent free this month</div>
                }
                <ion-progress-bar
                  [value]="progress()"
                  [color]="s.credits_remaining > 0 ? 'danger' : 'success'" />
                <div class="row">
                  <span>{{ s.credits_earned }} / {{ s.monthly_credit_target }} credits earned</span>
                  <span>Rent: <strong>{{ s.rent_owed | currency: h.currency }}</strong></span>
                </div>
                @if (myPendingCredits() > 0) {
                  <div class="pending-note">+{{ myPendingCredits() }} waiting for approval</div>
                }
              } @else {
                <div class="caption">Loading your month…</div>
              }
            </ion-card-content>
          </ion-card>

          <!-- ===== Needs your OK ===== -->
          @if (toReview().length) {
            <ion-list inset>
              <ion-list-header><ion-label>Needs your OK</ion-label></ion-list-header>
              @for (l of toReview(); track l.id) {
                <ion-item>
                  <ion-label>
                    <h3>{{ l.person_name }} · {{ l.chore_name }}</h3>
                    <p>{{ timeAgo(l.activity_at) }}{{ l.note ? ' · “' + l.note + '”' : '' }}</p>
                  </ion-label>
                  <ion-badge slot="end" color="medium">+{{ l.credits_awarded }}</ion-badge>
                  <ion-button slot="end" fill="clear" color="success" (click)="review(l, true)" aria-label="Approve">
                    <ion-icon slot="icon-only" name="checkmark-outline" />
                  </ion-button>
                  <ion-button slot="end" fill="clear" color="danger" (click)="review(l, false)" aria-label="Reject">
                    <ion-icon slot="icon-only" name="close-outline" />
                  </ion-button>
                </ion-item>
              }
            </ion-list>
          }

          <!-- ===== My chores ===== -->
          <ion-list inset>
            <ion-list-header><ion-label>My chores</ion-label></ion-list-header>
            @for (c of mine(); track c.chore_id) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h3>{{ c.name }}</h3>
                  <p>{{ c.frequency === 'daily' ? 'Do today' : 'Do by Sunday' }} · {{ credits(c.credit_value) }}</p>
                </ion-label>
                <ion-button slot="end" fill="clear" color="medium" (click)="giveBack(c)" aria-label="Give back">
                  <ion-icon slot="icon-only" name="arrow-undo-outline" />
                </ion-button>
                <ion-button slot="end" (click)="complete(c)">Done</ion-button>
              </ion-item>
            } @empty {
              <ion-item lines="none">
                <ion-label class="ion-text-wrap" color="medium">Nothing on your list. Accept a chore below.</ion-label>
              </ion-item>
            }
          </ion-list>

          <!-- ===== Available ===== -->
          <ion-list inset>
            <ion-list-header>
              <ion-label>Available</ion-label>
              @if (isAdmin()) {
                <ion-button (click)="editing.set(!editing())">{{ editing() ? 'Finish' : 'Edit' }}</ion-button>
                <ion-button (click)="addChore()">
                  <ion-icon slot="start" name="add-outline" /> Add
                </ion-button>
              }
            </ion-list-header>
            @for (c of available(); track c.chore_id) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h3>{{ c.name }}</h3>
                  <p>
                    {{ c.frequency === 'daily' ? 'Daily' : 'Weekly' }} · {{ credits(c.credit_value) }}
                    @if (c.max_per_person_month && c.my_count > 0) { · you've done {{ c.my_count }}/{{ c.max_per_person_month }} }
                  </p>
                </ion-label>
                @if (editing()) {
                  <ion-button slot="end" fill="clear" color="medium" (click)="removeChore(c)" aria-label="Remove chore">
                    <ion-icon slot="icon-only" name="trash-outline" />
                  </ion-button>
                }
                <ion-button slot="end" fill="outline" (click)="accept(c)">Accept</ion-button>
              </ion-item>
            } @empty {
              <ion-item lines="none">
                <ion-label class="ion-text-wrap" color="medium">
                  @if (board().length) {
                    Nothing to accept right now.
                  } @else if (isAdmin()) {
                    No chores yet. Tap <strong>Add</strong> to set what each job is worth.
                  } @else {
                    No chores yet. Ask the house admin to add some.
                  }
                </ion-label>
              </ion-item>
            }
          </ion-list>

          <!-- ===== Not available ===== -->
          @if (unavailable().length) {
            <ion-list inset>
              <ion-list-header><ion-label>Not available right now</ion-label></ion-list-header>
              @for (c of unavailable(); track c.chore_id) {
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <h3 class="muted">{{ c.name }}</h3>
                    <p>{{ reason(c) }}</p>
                  </ion-label>
                  @if (editing()) {
                    <ion-button slot="end" fill="clear" color="medium" (click)="removeChore(c)" aria-label="Remove chore">
                      <ion-icon slot="icon-only" name="trash-outline" />
                    </ion-button>
                  }
                </ion-item>
              }
            </ion-list>
          }

          <!-- ===== House this month ===== -->
          <ion-list inset>
            <ion-list-header><ion-label>House this month</ion-label></ion-list-header>
            @if (isAdmin()) {
              <ion-item lines="none">
                <ion-note class="hint">Tap someone to change their monthly target.</ion-note>
              </ion-item>
            }
            @for (row of leaderboard(); track row.user_id) {
              <ion-item [button]="isAdmin()" [detail]="false" (click)="isAdmin() && editTarget(row)">
                <ion-label>
                  <h3>{{ row.name }}{{ row.user_id === myId() ? ' (you)' : '' }}</h3>
                  <p>{{ row.earned }} / {{ row.target }} credits · rent {{ row.rent | currency: h.currency }}</p>
                </ion-label>
                <ion-note slot="end" [class.red]="row.remaining > 0" [class.green]="row.remaining === 0">
                  {{ row.remaining > 0 ? row.remaining + ' to go' : 'Rent free' }}
                </ion-note>
              </ion-item>
            }
          </ion-list>

          <!-- ===== Activity ===== -->
          <ion-list inset>
            <ion-list-header><ion-label>Recent activity</ion-label></ion-list-header>
            @for (l of logs(); track l.id) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <h3>{{ l.user_id === myId() ? 'You' : l.person_name }} · {{ l.chore_name }}</h3>
                  <p>{{ timeAgo(l.activity_at) }}{{ l.note ? ' · “' + l.note + '”' : '' }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="statusColour(l.status)">
                  {{ statusLabel(l) }}
                </ion-badge>
                @if (l.user_id === myId() && l.status === 'pending') {
                  <ion-button slot="end" fill="clear" color="medium" (click)="undo(l)" aria-label="Undo">
                    <ion-icon slot="icon-only" name="arrow-undo-outline" />
                  </ion-button>
                }
              </ion-item>
            } @empty {
              <ion-item lines="none">
                <ion-label color="medium">Nothing logged yet.</ion-label>
              </ion-item>
            }
          </ion-list>

          <!-- ===== House settings ===== -->
          <ion-list inset>
            <ion-list-header><ion-label>House</ion-label></ion-list-header>
            <ion-item>
              <ion-label>
                <h3>Invite code</h3>
                <p class="code">{{ h.invite_code }}</p>
              </ion-label>
              <ion-button slot="end" fill="clear" (click)="copyCode(h.invite_code)" aria-label="Copy invite code">
                <ion-icon slot="icon-only" name="copy-outline" />
              </ion-button>
            </ion-item>
            <ion-item lines="none">
              <ion-label class="ion-text-wrap">
                <h3>If you miss your target</h3>
                @if (isAdmin()) {
                  <ion-segment [value]="h.rent_mode" (ionChange)="setRentMode($any($event.detail.value))">
                    <ion-segment-button value="proportional"><ion-label>Pay what you're short</ion-label></ion-segment-button>
                    <ion-segment-button value="all_or_nothing"><ion-label>Pay full rent</ion-label></ion-segment-button>
                  </ion-segment>
                }
                <p>
                  @if (h.rent_mode === 'proportional') {
                    You pay the share of rent you didn't earn. Earn 60% of your credits, pay 40% of {{ h.monthly_rent | currency: h.currency }}.
                  } @else {
                    Hit your target and pay nothing. Miss it and pay the full {{ h.monthly_rent | currency: h.currency }}.
                  }
                </p>
              </ion-label>
            </ion-item>
          </ion-list>
        </div>
      }
    </ion-content>
  `,
  styles: `
    .wrap { max-width: 560px; margin: 0 auto; padding-bottom: 24px; }
    .month { text-align: center; margin-top: 16px; }
    .red-number { font-size: 4.5rem; font-weight: 800; line-height: 1; color: var(--ion-color-danger); margin-top: 8px; }
    .red-number.done { color: var(--ion-color-success); }
    .caption { margin: 6px 0 16px; color: var(--ion-color-medium); font-size: 0.95rem; }
    ion-progress-bar { height: 8px; border-radius: 4px; }
    .row { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; font-size: 0.9rem; flex-wrap: wrap; }
    .pending-note { margin-top: 8px; font-size: 0.85rem; color: var(--ion-color-medium); }
    ion-list-header ion-button { margin-right: 8px; }
    ion-note.red { color: var(--ion-color-danger); font-weight: 700; }
    ion-note.green { color: var(--ion-color-success); font-weight: 700; }
    ion-note.hint { font-size: 0.85rem; }
    h3.muted { color: var(--ion-color-medium); }
    .code { font-family: ui-monospace, monospace; letter-spacing: 0.15em; font-size: 1.2rem !important; }
    ion-segment { margin: 8px 0; }
    ion-segment-button ion-label { white-space: normal; font-size: 0.8rem; }
  `,
})
export class HomePage implements OnInit, OnDestroy {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
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
        return {
          user_id: m.user_id,
          name: m.display_name,
          earned: s?.credits_earned ?? 0,
          target: m.monthly_credit_target,
          remaining: s?.credits_remaining ?? m.monthly_credit_target,
          rent: s?.rent_owed ?? this.house()?.monthly_rent ?? 0,
        };
      })
      .sort((a, b) => a.remaining - b.remaining),
  );

  private stopWatching?: () => void;
  private reloadTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    addIcons({
      addOutline, checkmarkOutline, closeOutline, copyOutline,
      logOutOutline, arrowUndoOutline, trashOutline,
    });
  }

  async ngOnInit() {
    const house = await this.supabase.getMyHouse();
    this.house.set(house);
    if (!house) return;
    await this.load();
    // Refresh whenever a housemate logs or approves something
    this.stopWatching = this.supabase.watchHouse(house.id, () => this.scheduleReload());
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
      message: `Mark as done for ${c.credit_value} credits? A housemate will approve it.`,
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

  review(log: ChoreLog, approve: boolean) {
    return this.act(
      () => this.supabase.reviewLog(log.id, approve),
      approve ? `Approved ${log.person_name}'s ${log.chore_name.toLowerCase()}` : 'Rejected',
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
          text: 'Add',
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

  setRentMode(mode: House['rent_mode']) {
    const h = this.house();
    if (!h || h.rent_mode === mode) return;
    return this.act(() => this.supabase.updateHouse(h.id, { rent_mode: mode }), 'Rent rule updated');
  }

  async copyCode(code: string) {
    await navigator.clipboard?.writeText(code);
    this.show('Invite code copied');
  }

  async signOut() {
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // ---------- Helpers ----------

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

  statusColour(status: ChoreLog['status']) {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      case 'expired': return 'medium';
      default: return 'warning';
    }
  }

  statusLabel(l: ChoreLog): string {
    switch (l.status) {
      case 'approved': return '+' + l.credits_awarded;
      case 'rejected': return 'Rejected';
      case 'expired': return 'Missed';
      default: return 'Pending';
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
    return new Date(iso).toLocaleDateString();
  }
}