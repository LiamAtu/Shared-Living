import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  AlertController,
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronForward,
  copyOutline,
  logOutOutline,
  mailOutline,
  moonOutline,
  notificationsOutline,
  personOutline,
  phonePortraitOutline,
  shareOutline,
  sunnyOutline,
} from 'ionicons/icons';
import { House, Member, SupabaseService } from '../supabase.service';
import { ThemePref, ThemeService } from '../theme.service';
import { PushService } from '../push.service';
import { personTone } from '../chore-icons';

@Component({
  selector: 'app-settings',
  imports: [
    CurrencyPipe,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonContent,
    IonList, IonItem, IonLabel, IonNote, IonIcon, IonToggle, IonSegment, IonSegmentButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home" text="" />
        </ion-buttons>
        <ion-title>Settings</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="sl-page">

        <!-- ===== Profile ===== -->
        <div class="profile">
          <div class="avatar" [class]="'avatar ' + myTone()">{{ initial() }}</div>
          <div>
            <div class="profile-name">{{ name() || '…' }}</div>
            <div class="profile-email">{{ email() }}</div>
          </div>
        </div>

        <div class="sl-section"><h2>Your account</h2></div>
        <div class="sl-card">
          <ion-list lines="full">
            <ion-item button [detail]="false" (click)="editName()">
              <ion-icon name="person-outline" slot="start" />
              <ion-label>Name</ion-label>
              <ion-note slot="end">{{ name() }}</ion-note>
              <ion-icon name="chevron-forward" slot="end" class="chev" />
            </ion-item>
            <ion-item button [detail]="false" (click)="editEmail()">
              <ion-icon name="mail-outline" slot="start" />
              <ion-label>Email</ion-label>
              <ion-note slot="end" class="ellipsis">{{ email() }}</ion-note>
              <ion-icon name="chevron-forward" slot="end" class="chev" />
            </ion-item>
          </ion-list>
        </div>

        <!-- ===== Appearance ===== -->
        <div class="sl-section"><h2>Appearance</h2></div>
        <div class="sl-card pad">
          <ion-segment mode="ios" [value]="theme.pref()" (ionChange)="setTheme($any($event.detail.value))">
            <ion-segment-button value="system">
              <ion-icon name="phone-portrait-outline" />
              <ion-label>System</ion-label>
            </ion-segment-button>
            <ion-segment-button value="light">
              <ion-icon name="sunny-outline" />
              <ion-label>Light</ion-label>
            </ion-segment-button>
            <ion-segment-button value="dark">
              <ion-icon name="moon-outline" />
              <ion-label>Dark</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <!-- ===== Notifications ===== -->
        <div class="sl-section"><h2>Notifications</h2></div>
        <div class="sl-card">
          <ion-list lines="none">
            <ion-item>
              <ion-icon name="notifications-outline" slot="start" />
              <ion-toggle
                [checked]="push.enabled()"
                [disabled]="pushBusy() || (!!blocker() && !push.enabled())"
                (ionChange)="togglePush($event.detail.checked)"
                justify="space-between">
                Allow notifications
              </ion-toggle>
            </ion-item>
          </ion-list>
          <div class="explain">
            @switch (blocker()) {
              @case ('ios-install') {
                On iPhone, add Shared Living to your Home Screen (Share → Add to Home Screen) and open it from there to turn these on.
              }
              @case ('denied') {
                Notifications are blocked. Allow them for Shared Living in your phone's settings, then come back.
              }
              @case ('unsupported') {
                This browser can't show notifications. Open the installed app on your phone instead.
              }
              @case ('not-configured') {
                Notifications haven't been set up on the server yet.
              }
              @default {
                Get told when a housemate's chore needs your OK, when yours is approved, and at 7pm if something on your list is still due.
              }
            }
          </div>
          @if (push.enabled()) {
            <div class="actions">
              <ion-button class="pill" fill="outline" size="small" (click)="sendTest()" [disabled]="pushBusy()">
                Send a test
              </ion-button>
            </div>
          }
        </div>

        <!-- ===== House ===== -->
        @if (house(); as h) {
          <div class="sl-section"><h2>{{ h.name }}</h2></div>
          <div class="sl-card pad">
            <div class="label">Invite code</div>
            <div class="code-row">
              <div class="code">{{ h.invite_code }}</div>
              <ion-button fill="clear" (click)="copyCode(h.invite_code)" aria-label="Copy invite code">
                <ion-icon slot="icon-only" name="copy-outline" />
              </ion-button>
              @if (canShare) {
                <ion-button fill="clear" (click)="shareCode(h)" aria-label="Share invite">
                  <ion-icon slot="icon-only" name="share-outline" />
                </ion-button>
              }
            </div>
            <div class="hint">Housemates sign up, tap <strong>Join a house</strong> and enter this code.</div>

            <div class="divider"></div>

            <div class="rent-row">
              <div class="label">Monthly rent</div>
              <div class="rent">{{ h.monthly_rent | currency: h.currency }}</div>
            </div>

            <div class="label top">If you miss your target</div>
            @if (isAdmin()) {
              <ion-segment mode="ios" [value]="h.rent_mode" (ionChange)="setRentMode($any($event.detail.value))">
                <ion-segment-button value="proportional"><ion-label>Pay what you're short</ion-label></ion-segment-button>
                <ion-segment-button value="all_or_nothing"><ion-label>Pay full rent</ion-label></ion-segment-button>
              </ion-segment>
            }
            <div class="hint">
              @if (h.rent_mode === 'proportional') {
                You pay the share of rent you didn't earn. Earn 60% of your credits, pay 40% of {{ h.monthly_rent | currency: h.currency }}.
              } @else {
                Hit your target and pay nothing. Miss it and pay the full {{ h.monthly_rent | currency: h.currency }}.
              }
            </div>
          </div>
        }

        <ion-button class="pill logout" expand="block" fill="outline" color="danger" (click)="signOut()">
          <ion-icon slot="start" name="log-out-outline" />
          Log out
        </ion-button>
      </div>
    </ion-content>
  `,
  styles: `
    .profile { display: flex; align-items: center; gap: 14px; margin: 8px 4px 0; }
    .avatar {
      width: 60px; height: 60px; border-radius: 20px; display: grid; place-items: center;
      font-size: 1.6rem; font-weight: 900; color: var(--sl-glyph); background: var(--sl-surface-2);
    }
    .avatar.mint { background: var(--sl-mint); }
    .avatar.lavender { background: var(--sl-lavender); }
    .avatar.butter { background: var(--sl-butter); }
    .avatar.peach { background: var(--sl-peach); }
    .avatar.sky { background: var(--sl-sky); }
    .avatar.rose { background: var(--sl-rose); }
    .profile-name { font-size: 1.35rem; font-weight: 900; }
    .profile-email { color: var(--sl-muted); font-size: 0.9rem; }

    .sl-card ion-item { --min-height: 56px; }
    .sl-card ion-item > ion-icon[slot='start'] { color: var(--sl-muted); margin-right: 14px; font-size: 22px; }
    ion-note { font-size: 0.95rem; color: var(--sl-muted); }
    .ellipsis { max-width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chev { color: var(--sl-muted); font-size: 18px; margin-left: 6px; }
    ion-toggle { font-weight: 600; --track-background-checked: var(--ion-color-success); }

    .pad { padding: 16px; }
    .explain { padding: 0 16px 16px 52px; color: var(--sl-muted); font-size: 0.88rem; line-height: 1.45; }
    .actions { padding: 0 16px 16px 52px; }
    ion-segment-button ion-icon { font-size: 18px; margin-bottom: 2px; }
    ion-segment-button ion-label { font-size: 0.8rem; white-space: normal; }

    .label { font-size: 0.8rem; font-weight: 800; color: var(--sl-muted); text-transform: uppercase; letter-spacing: 0.06em; }
    .label.top { margin: 16px 0 8px; }
    .code-row { display: flex; align-items: center; gap: 2px; margin-top: 4px; }
    .code {
      flex: 1; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 1.7rem; font-weight: 700;
      letter-spacing: 0.18em; color: var(--sl-text);
    }
    .hint { color: var(--sl-muted); font-size: 0.88rem; line-height: 1.45; margin-top: 8px; }
    .divider { height: 1px; background: var(--sl-border); margin: 16px -16px; }
    .rent-row { display: flex; justify-content: space-between; align-items: center; }
    .rent { font-weight: 900; font-size: 1.1rem; }

    .logout { margin-top: 28px; }
  `,
})
export class SettingsPage implements OnInit {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toast = inject(ToastController);
  private alerts = inject(AlertController);
  readonly theme = inject(ThemeService);
  readonly push = inject(PushService);

  readonly name = signal('');
  readonly house = signal<House | null>(null);
  readonly members = signal<Member[]>([]);
  readonly pushBusy = signal(false);
  readonly blocker = signal(this.push.blocker());

  readonly email = computed(() => this.supabase.session()?.user.email ?? '');
  readonly myId = computed(() => this.supabase.session()?.user.id ?? '');
  readonly initial = computed(() => (this.name().trim()[0] ?? '?').toUpperCase());
  readonly myTone = computed(() => personTone(this.myId()));
  readonly isAdmin = computed(
    () => this.members().find((m) => m.user_id === this.myId())?.role === 'admin',
  );
  readonly canShare = typeof navigator.share === 'function';

  constructor() {
    addIcons({
      chevronForward, copyOutline, logOutOutline, mailOutline, moonOutline,
      notificationsOutline, personOutline, phonePortraitOutline, shareOutline, sunnyOutline,
    });
  }

  async ngOnInit() {
    try {
      const [name, house] = await Promise.all([this.supabase.getMyName(), this.supabase.getMyHouse()]);
      this.name.set(name);
      this.house.set(house);
      if (house) this.members.set(await this.supabase.getMembers(house.id));
      // If this phone already has notifications on, make sure they go to whoever is logged in
      if (this.push.enabled()) await this.push.resync();
    } catch (e: any) {
      this.show(e?.message ?? 'Could not load settings.');
    }
  }

  // ---------- Account ----------

  async editName() {
    const alert = await this.alerts.create({
      header: 'Your name',
      message: 'This is what housemates see.',
      inputs: [{ name: 'name', type: 'text', value: this.name(), attributes: { maxlength: 40 } }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (v) => {
            const name = (v?.name ?? '').trim();
            if (!name) {
              this.show('Enter a name.');
              return false;
            }
            this.run(async () => {
              await this.supabase.updateName(name);
              this.name.set(name);
            }, 'Name updated');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async editEmail() {
    const alert = await this.alerts.create({
      header: 'Change email',
      message: "You'll log in with the new address.",
      inputs: [{ name: 'email', type: 'email', value: this.email(), placeholder: 'you@example.com' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Save',
          handler: (v) => {
            const email = (v?.email ?? '').trim().toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
              this.show('Enter a valid email address.');
              return false;
            }
            if (email === this.email()) return true;
            this.run(async () => {
              const needsConfirm = await this.supabase.updateEmail(email);
              this.show(
                needsConfirm
                  ? `Check ${email} and tap the link to confirm the change.`
                  : 'Email updated',
                5000,
              );
            });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  setTheme(pref: ThemePref) {
    this.theme.set(pref);
  }

  // ---------- Notifications ----------

  async togglePush(on: boolean) {
    if (on === this.push.enabled()) return;
    this.pushBusy.set(true);
    try {
      if (on) {
        await this.push.enable();
        this.show("Notifications are on. You'll get a test in a moment.");
        await this.push.sendTest().catch(() => 0);
      } else {
        await this.push.disable();
        this.show('Notifications are off on this phone');
      }
    } catch (e: any) {
      this.blocker.set(this.push.blocker());
      const msg = this.blocker() === 'denied'
        ? 'Notifications are blocked in your phone settings.'
        : (e?.message ?? 'Could not change notifications.');
      this.show(msg);
    } finally {
      this.pushBusy.set(false);
    }
  }

  async sendTest() {
    this.pushBusy.set(true);
    try {
      const sent = await this.push.sendTest();
      this.show(sent ? 'Test sent. It should arrive in a few seconds.' : 'No devices to send to. Try turning notifications off and on.');
    } catch (e: any) {
      this.show(e?.message ?? 'Could not send a test.');
    } finally {
      this.pushBusy.set(false);
    }
  }

  // ---------- House ----------

  async copyCode(code: string) {
    await navigator.clipboard?.writeText(code);
    this.show('Invite code copied');
  }

  async shareCode(h: House) {
    try {
      await navigator.share({
        title: 'Join our house on Shared Living',
        text: `Join ${h.name} on Shared Living. Sign up, tap "Join a house" and enter the code ${h.invite_code}`,
        url: location.origin,
      });
    } catch {
      // Share sheet closed
    }
  }

  setRentMode(mode: House['rent_mode']) {
    const h = this.house();
    if (!h || h.rent_mode === mode) return;
    this.run(async () => {
      await this.supabase.updateHouse(h.id, { rent_mode: mode });
      this.house.set({ ...h, rent_mode: mode });
    }, 'Rent rule updated');
  }

  async signOut() {
    // Stop this phone getting the previous person's notifications
    await this.push.disable().catch(() => {});
    await this.supabase.signOut();
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }

  // ---------- Helpers ----------

  private async run(action: () => Promise<void>, success?: string) {
    try {
      await action();
      if (success) this.show(success);
    } catch (e: any) {
      this.show(e?.message ?? 'Something went wrong.');
    }
  }

  private async show(message: string, duration = 2500) {
    const t = await this.toast.create({ message, duration, position: 'top' });
    await t.present();
  }
}
