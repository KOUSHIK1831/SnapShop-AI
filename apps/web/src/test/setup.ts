import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import React from 'react';
import en from '../locales/en/translation.json';

afterEach(() => cleanup());

// Node 26 exposes an experimental `localStorage` global that is `undefined`
// unless the process is started with --localstorage-file. It shadows jsdom's
// implementation, so provide an in-memory fallback for tests.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>();

  const storageApi: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(String(key)) ?? null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(String(key));
    },
    setItem(key: string, value: string) {
      store.set(String(key), String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    value: storageApi,
    configurable: true,
  });
}

// Polyfill React.use() for React 18 (shadcn/ui components use React 19 use() API)
if (!React.use) {
  (React as any).use = React.useContext;
}

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn().mockResolvedValue({ remove: vi.fn() }),
    exitApp: vi.fn(),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => (en as any)[key] || key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  initReactI18next: {
    type: '3rdParty',
    init: vi.fn(),
  },
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

class IntersectionObserverMock {
  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
  }
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock as any;

// Radix UI needs PointerEvent
if (!window.PointerEvent) {
  class PointerEvent extends MouseEvent {
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params);
    }
  }
  (window as any).PointerEvent = PointerEvent;
}
