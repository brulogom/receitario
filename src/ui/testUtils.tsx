import { render } from '@testing-library/react';
import { IDBFactory } from 'fake-indexeddb';
import type { ReactNode } from 'react';
import { closeDb } from '../storage/db';
import { RecipesProvider } from './useRecipes';
import { TimersProvider } from './useTimers';

export function resetStorage() {
  closeDb();
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  window.location.hash = '';
}

export function renderScreen(ui: ReactNode, alarm: () => void = () => {}) {
  return render(
    <RecipesProvider>
      <TimersProvider alarm={alarm}>{ui}</TimersProvider>
    </RecipesProvider>,
  );
}
