import { useEffect, useRef, useState } from 'react';
import { catalog } from '../catalog';
import { getMine } from '../storage/recipes';
import type { Recipe } from '../domain/types';
import { BookImport } from './screens/BookImport';
import { CookScreen } from './screens/CookScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ImportReview } from './screens/ImportReview';
import { MineScreen } from './screens/MineScreen';
import { PantryScreen } from './screens/PantryScreen';
import { RecipeForm } from './screens/RecipeForm';
import { RecipeScreen } from './screens/RecipeScreen';
import { SavedScreen } from './screens/SavedScreen';
import { SearchScreen } from './screens/SearchScreen';
import { ShoppingScreen } from './screens/ShoppingScreen';
import { readShare, type Share } from './shareTarget';
import { TimerBar } from './TimerBar';
import { RecipesProvider, useRecipes } from './useRecipes';
import { TimersProvider } from './useTimers';

const TABS = [
  ['buscar', 'Buscar', 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3'],
  ['casa', 'Em casa', 'M3 11l9-8 9 8M5 10v10h14V10'],
  ['minhas', 'Minhas', 'M4 5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2zM8 7h8'],
  ['salvas', 'Salvas', 'M12 20s-7-4.6-9-9a5 5 0 0 1 9-4 5 5 0 0 1 9 4c-2 4.4-9 9-9 9z'],
  ['compras', 'Compras', 'M3 4h2l2.5 12h11L21 8H6M9 20h.01M17 20h.01'],
] as const;

type Tab = (typeof TABS)[number][0];

function parseHash(hash: string): string[] {
  return hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
}

function useHashRoute(): string[] {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash));
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

function TabScreen({ tab }: { tab: Tab }) {
  if (tab === 'casa') return <PantryScreen />;
  if (tab === 'minhas') return <MineScreen />;
  if (tab === 'salvas') return <SavedScreen />;
  if (tab === 'compras') return <ShoppingScreen />;
  return <SearchScreen />;
}

function EditScreen({ id }: { id: string }) {
  const { loaded } = useRecipes();
  const [recipe, setRecipe] = useState<Recipe | null | undefined>(undefined);
  useEffect(() => {
    void getMine(id).then((found) => setRecipe(found ?? catalog.find((item) => item.id === id) ?? null));
  }, [id, loaded]);
  if (recipe === undefined) return null;
  if (recipe === null) return <p>Esta receita não foi encontrada.</p>;
  return <RecipeForm key={recipe.id} initial={recipe} />;
}

function Shell({ initialShare }: { initialShare: Share | null }) {
  const route = useHashRoute();
  const [section, id, extra] = route;
  const [share, setShare] = useState(initialShare);
  useEffect(() => {
    // O que foi compartilhado vale só para esta abertura da tela de nova receita.
    if (section !== 'nova') setShare(null);
  }, [section]);
  const isTab = TABS.some(([tab]) => tab === section);
  const lastTab = useRef<Tab>('buscar');
  if (isTab) lastTab.current = section as Tab;
  const tab = lastTab.current;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [section, id]);

  useEffect(() => {
    // Protege as receitas de serem removidas pelo navegador quando faltar espaço.
    void navigator.storage?.persist?.();
  }, []);

  if (section === 'cozinha' && id) {
    return (
      <div className="cook-layer">
        <CookScreen id={id} servings={extra ? Number(extra) : undefined} />
        <TimerBar />
      </div>
    );
  }

  let detail = null;
  if (section === 'receita' && id) detail = <RecipeScreen key={id} id={id} backHref={`#/${tab}`} />;
  else if (section === 'nova') detail = <RecipeForm draft initial={share?.recipe} leftovers={share?.leftovers} />;
  else if (section === 'importar') detail = <ImportReview />;
  else if (section === 'livro') detail = <BookImport />;
  else if (section === 'editar' && id) detail = <EditScreen id={id} />;
  else if (section === 'historico' && id) detail = <HistoryScreen id={id} />;

  return (
    <div className="app" data-detail={detail ? 'true' : 'false'}>
      <nav className="tabs" aria-label="Principal">
        <div className="tabs-brand">Receitário</div>
        {TABS.map(([value, label, path]) => (
          <a key={value} className="tab" href={`#/${value}`} aria-current={tab === value ? 'page' : undefined}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>
            {label}
          </a>
        ))}
      </nav>
      <div className="list-pane"><TabScreen tab={tab} /></div>
      <main className="detail-pane">
        {detail ?? <p className="muted detail-empty">Escolha uma receita na lista para ver aqui.</p>}
      </main>
      <TimerBar />
    </div>
  );
}

export function App() {
  const [share] = useState<Share | null>(() => {
    const found = readShare(window.location.search);
    if (found) {
      window.history.replaceState(null, '', window.location.pathname + '#/nova');
    }
    return found;
  });
  return (
    <RecipesProvider>
      <TimersProvider>
        <Shell initialShare={share} />
      </TimersProvider>
    </RecipesProvider>
  );
}
