import { Injectable, signal } from '@angular/core';
import { createClient, Session, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

export interface House {
  id: string;
  name: string;
  monthly_rent: number;
  currency: string;
  rent_mode: 'proportional' | 'all_or_nothing';
  invite_code: string;
}

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client: SupabaseClient = createClient(environment.supabaseUrl, environment.supabaseKey, {
    auth: {
      // Angular's zone.js and the browser's navigator.locks can deadlock;
      // a single-tab app doesn't need the lock, so just run the callback.
      lock: async (_name, _timeout, fn) => fn(),
    },
  });

  /** The logged-in user's session, or null. Updates automatically. */
  readonly session = signal<Session | null>(null);

  private readonly ready: Promise<void>;

  constructor() {
    this.ready = this.client.auth
      .getSession()
      .then(({ data }) => this.session.set(data.session));
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  /** Waits for the saved session to load (used by route guards). */
  async getSession(): Promise<Session | null> {
    await this.ready;
    return this.session();
  }

  // ---------- Auth ----------

  /** Returns true if the user is logged in straight away,
   *  false if Supabase sent a confirmation email first. */
  async signUp(email: string, password: string, displayName: string): Promise<boolean> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName } },
    });
    if (error) throw error;
    return !!data.session;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
  }

  // ---------- Houses ----------

  /** The house the user belongs to (Row Level Security only returns their own). */
  async getMyHouse(): Promise<House | null> {
    const { data, error } = await this.client
      .from('houses')
      .select('id, name, monthly_rent, currency, rent_mode, invite_code')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data as House | null;
  }

  async createHouse(name: string, rent: number): Promise<string> {
    const { data, error } = await this.client.rpc('create_house', { house_name: name, rent });
    if (error) throw error;
    return data as string;
  }

  async joinHouse(code: string): Promise<string> {
    const { data, error } = await this.client.rpc('join_house', {
      code: code.trim().toLowerCase(),
    });
    if (error) throw error;
    return data as string;
  }
}
