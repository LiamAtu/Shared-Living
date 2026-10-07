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

  // ---------- Profile ----------

  async getMyName(): Promise<string> {
    const id = this.session()?.user.id;
    if (!id) return '';
    const { data, error } = await this.client
      .from('profiles')
      .select('display_name')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data?.display_name ?? '';
  }

  async updateName(name: string): Promise<void> {
    const id = this.session()?.user.id;
    const { error } = await this.client.from('profiles').update({ display_name: name }).eq('id', id);
    if (error) throw error;
  }

  /** Returns true if Supabase sent a confirmation link to the new address first. */
  async updateEmail(email: string): Promise<boolean> {
    const { data, error } = await this.client.auth.updateUser(
      { email },
      { emailRedirectTo: `${location.origin}/settings` },
    );
    if (error) throw error;
    return !!data.user?.new_email;
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

  async updateHouse(houseId: string, changes: Partial<Pick<House, 'name' | 'monthly_rent' | 'rent_mode'>>) {
    const { error } = await this.client.from('houses').update(changes).eq('id', houseId);
    if (error) throw error;
  }

  // ---------- Members ----------

  async getMembers(houseId: string): Promise<Member[]> {
    const { data, error } = await this.client
      .from('house_members')
      .select('user_id, role, monthly_credit_target, profile:profiles(display_name)')
      .eq('house_id', houseId);
    if (error) throw error;
    return (data ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      monthly_credit_target: m.monthly_credit_target,
      display_name: m.profile?.display_name ?? 'Housemate',
    }));
  }

  /** Admin only: how many credits this person needs to earn each month. */
  async setCreditTarget(houseId: string, userId: string, target: number): Promise<void> {
    const { error } = await this.client
      .from('house_members')
      .update({ monthly_credit_target: target })
      .eq('house_id', houseId)
      .eq('user_id', userId);
    if (error) throw error;
  }

  // ---------- Chores ----------

  /** Every chore in the house and what you can do with it right now. */
  async getBoard(): Promise<BoardChore[]> {
    const { data, error } = await this.client.rpc('chore_board');
    if (error) throw error;
    return (data ?? []) as BoardChore[];
  }

  async addChore(
    houseId: string,
    name: string,
    creditValue: number,
    frequency: 'daily' | 'weekly',
  ): Promise<void> {
    const { error } = await this.client.from('chores').insert({
      house_id: houseId,
      name,
      credit_value: creditValue,
      suggested_frequency: frequency,
      cooldown_days: frequency === 'weekly' ? 5 : 0,
    });
    if (error) throw error;
  }

  /** Hides a chore. Past logs keep their credits. */
  async archiveChore(choreId: string): Promise<void> {
    const { error } = await this.client.from('chores').update({ is_active: false }).eq('id', choreId);
    if (error) throw error;
  }

  // ---------- Chore logs ----------

  /** Accept a chore: it goes onto your list with a deadline. */
  async claimChore(choreId: string): Promise<void> {
    const { error } = await this.client.rpc('claim_chore', { p_chore: choreId });
    if (error) throw error;
  }

  /** Mark an accepted chore as done; it goes to housemates for approval. */
  async completeChore(logId: string, note?: string): Promise<void> {
    const { error } = await this.client.rpc('complete_chore', {
      p_log: logId,
      p_note: note?.trim() || null,
    });
    if (error) throw error;
  }

  /** Give an accepted chore back so someone else can take it. */
  async releaseChore(logId: string): Promise<void> {
    const { error } = await this.client.rpc('release_chore', { p_log: logId });
    if (error) throw error;
  }

  /** Done, approved, rejected and missed chores (not ones still in progress). */
  async getRecentLogs(houseId: string, limit = 30): Promise<ChoreLog[]> {
    const { data, error } = await this.client
      .from('chore_logs')
      .select(
        'id, user_id, credits_awarded, note, status, completed_at, activity_at, reviewed_by, ' +
          'chore:chores(name), person:profiles!chore_logs_user_id_fkey(display_name)',
      )
      .eq('house_id', houseId)
      .neq('status', 'claimed')
      .order('activity_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      credits_awarded: l.credits_awarded,
      note: l.note,
      status: l.status,
      completed_at: l.completed_at,
      activity_at: l.activity_at,
      reviewed_by: l.reviewed_by,
      chore_name: l.chore?.name ?? 'Chore',
      person_name: l.person?.display_name ?? 'Housemate',
    }));
  }

  async reviewLog(logId: string, approve: boolean): Promise<void> {
    const { error } = await this.client.rpc('review_chore_log', { log_id: logId, approve });
    if (error) throw error;
  }

  /** Undo your own chore while it's still waiting for approval. */
  async deleteLog(logId: string): Promise<void> {
    const { error } = await this.client.from('chore_logs').delete().eq('id', logId);
    if (error) throw error;
  }

  // ---------- Monthly statements ----------

  /** Everyone in the house for one month (defaults to this month). */
  async getStatements(houseId: string, month = SupabaseService.thisMonth()): Promise<Statement[]> {
    const { data, error } = await this.client
      .from('monthly_statements')
      .select('user_id, month, credits_earned, monthly_credit_target, credits_remaining, monthly_rent, rent_owed')
      .eq('house_id', houseId)
      .eq('month', month);
    if (error) throw error;
    return data as Statement[];
  }

  static thisMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  }

  // ---------- Live updates ----------

  /** Calls onChange whenever chores, logs or members change in this house.
   *  Returns a function that stops listening. */
  watchHouse(houseId: string, onChange: () => void): () => void {
    const filter = `house_id=eq.${houseId}`;
    const channel = this.client
      .channel(`house-${houseId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chore_logs', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chores', filter }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'house_members', filter }, onChange)
      .subscribe();
    return () => {
      this.client.removeChannel(channel);
    };
  }

  /** Calls onChange whenever any of these tables change in this house. */
  watchTables(houseId: string, tables: string[], onChange: () => void): () => void {
    const filter = `house_id=eq.${houseId}`;
    let channel = this.client.channel(`${tables.join('-')}-${houseId}-${Math.random().toString(36).slice(2, 8)}`);
    for (const table of tables) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange);
    }
    channel.subscribe();
    return () => {
      this.client.removeChannel(channel);
    };
  }

  // ---------- Dinner ----------

  async getMenu(houseId: string, from: string, to: string): Promise<DinnerDay[]> {
    const { data, error } = await this.client
      .from('dinner_menu')
      .select('id, day, meal, note, updated_at, by:profiles!dinner_menu_updated_by_fkey(display_name)')
      .eq('house_id', houseId)
      .gte('day', from)
      .lte('day', to);
    if (error) throw error;
    return (data ?? []).map((d: any) => ({
      id: d.id,
      day: d.day,
      meal: d.meal,
      note: d.note,
      updated_at: d.updated_at,
      by_name: d.by?.display_name ?? null,
    }));
  }

  async setDinner(day: string, meal: string, note?: string | null): Promise<void> {
    const { error } = await this.client.rpc('set_dinner', {
      p_day: day,
      p_meal: meal,
      p_note: note ?? null,
    });
    if (error) throw error;
  }

  async clearDinner(houseId: string, day: string): Promise<void> {
    const { error } = await this.client.from('dinner_menu').delete().eq('house_id', houseId).eq('day', day);
    if (error) throw error;
  }

  /** Every dinner the house has had, most common first. */
  async pastDinners(): Promise<string[]> {
    const { data, error } = await this.client.rpc('past_dinners');
    if (error) throw error;
    return (data ?? []).map((d: any) => d.meal as string);
  }

  async getSuggestions(houseId: string): Promise<Suggestion[]> {
    const { data, error } = await this.client
      .from('dinner_suggestions')
      .select('id, meal, created_at, suggested_by, by:profiles!dinner_suggestions_suggested_by_fkey(display_name)')
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((s: any) => ({
      id: s.id,
      meal: s.meal,
      created_at: s.created_at,
      suggested_by: s.suggested_by,
      by_name: s.by?.display_name ?? 'Someone',
    }));
  }

  async addSuggestion(houseId: string, meal: string): Promise<void> {
    const { error } = await this.client
      .from('dinner_suggestions')
      .insert({ house_id: houseId, meal: meal.trim(), suggested_by: this.session()?.user.id });
    if (error) throw error;
  }

  async removeSuggestion(id: string): Promise<void> {
    const { error } = await this.client.from('dinner_suggestions').delete().eq('id', id);
    if (error) throw error;
  }

  // ---------- Shopping list ----------

  async getShopping(houseId: string): Promise<ShoppingItem[]> {
    const { data, error } = await this.client
      .from('shopping_items')
      .select(
        'id, name, created_at, bought, bought_at, ' +
          'adder:profiles!shopping_items_added_by_fkey(display_name), ' +
          'buyer:profiles!shopping_items_bought_by_fkey(display_name)',
      )
      .eq('house_id', houseId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((i: any) => ({
      id: i.id,
      name: i.name,
      created_at: i.created_at,
      bought: i.bought,
      bought_at: i.bought_at,
      added_by_name: i.adder?.display_name ?? 'Someone',
      bought_by_name: i.buyer?.display_name ?? null,
    }));
  }

  async addShoppingItem(houseId: string, name: string): Promise<void> {
    const { error } = await this.client
      .from('shopping_items')
      .insert({ house_id: houseId, name: name.trim(), added_by: this.session()?.user.id });
    if (error) throw error;
  }

  async setBought(id: string, bought: boolean): Promise<void> {
    const { error } = await this.client.from('shopping_items').update({ bought }).eq('id', id);
    if (error) throw error;
  }

  async removeShoppingItem(id: string): Promise<void> {
    const { error } = await this.client.from('shopping_items').delete().eq('id', id);
    if (error) throw error;
  }

  async clearBought(houseId: string): Promise<void> {
    const { error } = await this.client.from('shopping_items').delete().eq('house_id', houseId).eq('bought', true);
    if (error) throw error;
  }

  // ---------- History ----------

  /** Done chores (approved or waiting for OK) since a date, oldest first. */
  async getHistory(houseId: string, sinceIso: string): Promise<HistoryEntry[]> {
    const { data, error } = await this.client
      .from('chore_logs')
      .select(
        'id, user_id, credits_awarded, status, completed_at, ' +
          'chore:chores(name), person:profiles!chore_logs_user_id_fkey(display_name)',
      )
      .eq('house_id', houseId)
      .in('status', ['pending', 'approved'])
      .gte('completed_at', sinceIso)
      .order('completed_at', { ascending: true })
      .limit(2000);
    if (error) throw error;
    return (data ?? []).map((l: any) => ({
      id: l.id,
      user_id: l.user_id,
      credits: l.credits_awarded,
      status: l.status,
      completed_at: l.completed_at,
      chore_name: l.chore?.name ?? 'Chore',
      person_name: l.person?.display_name ?? 'Housemate',
    }));
  }
}

export interface DinnerDay {
  id: string;
  day: string; // YYYY-MM-DD
  meal: string;
  note: string | null;
  updated_at: string;
  by_name: string | null;
}

export interface Suggestion {
  id: string;
  meal: string;
  created_at: string;
  suggested_by: string | null;
  by_name: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  created_at: string;
  bought: boolean;
  bought_at: string | null;
  added_by_name: string;
  bought_by_name: string | null;
}

export interface HistoryEntry {
  id: string;
  user_id: string;
  credits: number;
  status: 'pending' | 'approved';
  completed_at: string;
  chore_name: string;
  person_name: string;
}

export interface Member {
  user_id: string;
  role: 'admin' | 'member';
  monthly_credit_target: number;
  display_name: string;
}

/** A chore as you see it right now (from the chore_board function). */
export interface BoardChore {
  chore_id: string;
  name: string;
  credit_value: number;
  frequency: 'daily' | 'weekly';
  max_per_person_month: number | null;
  /** mine: on your list · taken: someone else has it · done: done today (daily)
   *  cooldown: weekly chore resting · limit: you hit your monthly limit · available */
  state: 'mine' | 'taken' | 'done' | 'cooldown' | 'limit' | 'available';
  available_from: string | null;
  holder_name: string | null;
  log_id: string | null;
  due_at: string | null;
  my_count: number;
}

export interface ChoreLog {
  id: string;
  user_id: string;
  credits_awarded: number;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  completed_at: string | null;
  activity_at: string;
  reviewed_by: string | null;
  chore_name: string;
  person_name: string;
}

export interface Statement {
  user_id: string;
  month: string;
  credits_earned: number;
  monthly_credit_target: number;
  credits_remaining: number;
  monthly_rent: number;
  rent_owed: number;
}