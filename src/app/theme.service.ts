import { Injectable, signal } from '@angular/core';

export type ThemePref = 'system' | 'light' | 'dark';

const KEY = 'sl-theme';

/** Light / dark mode. The choice is saved on this device. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly pref = signal<ThemePref>(this.read());
  private media = window.matchMedia('(prefers-color-scheme: dark)');

  constructor() {
    // Follow the phone's setting live when on "System"
    this.media.addEventListener('change', () => {
      if (this.pref() === 'system') this.apply();
    });
    this.apply();
  }

  set(pref: ThemePref) {
    this.pref.set(pref);
    try {
      localStorage.setItem(KEY, pref);
    } catch {}
    this.apply();
  }

  private read(): ThemePref {
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'light' || v === 'dark' || v === 'system') return v;
    } catch {}
    return 'system';
  }

  private apply() {
    const pref = this.pref();
    const dark = pref === 'dark' || (pref === 'system' && this.media.matches);
    document.documentElement.classList.toggle('ion-palette-dark', dark);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', dark ? '#161E2C' : '#FBF6EE');
  }
}
