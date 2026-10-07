import { inject, Injectable, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';
import { SupabaseService } from './supabase.service';

/** Why notifications can't be turned on, if they can't. */
export type PushBlocker = 'not-configured' | 'ios-install' | 'unsupported' | 'denied' | null;

/** Turning push notifications on and off for this phone. */
@Injectable({ providedIn: 'root' })
export class PushService {
  private swPush = inject(SwPush);
  private supabase = inject(SupabaseService);

  /** True when this device is subscribed. */
  readonly enabled = signal(false);

  private readonly vapidKey = (environment as { vapidPublicKey?: string }).vapidPublicKey ?? '';

  constructor() {
    this.swPush.subscription.subscribe((sub) => this.enabled.set(!!sub));
  }

  blocker(): PushBlocker {
    if (!this.vapidKey || this.vapidKey.startsWith('YOUR')) return 'not-configured';
    const supported =
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    if (!supported || !this.swPush.isEnabled) {
      const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const installed =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as { standalone?: boolean }).standalone === true;
      return ios && !installed ? 'ios-install' : 'unsupported';
    }
    if (Notification.permission === 'denied') return 'denied';
    return null;
  }

  /** Ask permission, subscribe this device, and save it to the database. */
  async enable(): Promise<void> {
    const sub = await this.swPush.requestSubscription({ serverPublicKey: this.vapidKey });
    await this.save(sub);
  }

  /** Stop notifications on this device. */
  async disable(): Promise<void> {
    const sub = await firstValueFrom(this.swPush.subscription);
    if (!sub) return;
    await this.supabase.client.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
    await sub.unsubscribe();
  }

  /** Make sure the database knows this device belongs to whoever is logged in now. */
  async resync(): Promise<void> {
    if (!this.swPush.isEnabled) return;
    const sub = await firstValueFrom(this.swPush.subscription);
    if (sub) await this.save(sub);
  }

  /** Sends a test notification to yourself. */
  async sendTest(): Promise<number> {
    const { data, error } = await this.supabase.client.functions.invoke('notify', {
      body: { type: 'test' },
    });
    if (error) throw error;
    return (data as { sent?: number })?.sent ?? 0;
  }

  private async save(sub: PushSubscription) {
    const json = sub.toJSON();
    const { error } = await this.supabase.client.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: json.keys?.['p256dh'],
      p_auth: json.keys?.['auth'],
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
    if (error) throw error;
  }
}
