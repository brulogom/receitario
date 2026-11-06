import { useEffect, useState } from 'react';
import { formatIngredient } from '../../domain/portions';
import { detectMinutes } from '../../domain/timers';
import { useRecipes } from '../useRecipes';
import { useTimers } from '../useTimers';
import { useWakeLock } from '../useWakeLock';

export function CookScreen({ id, servings }: { id: string; servings?: number }) {
  const { all, loaded } = useRecipes();
  const { start } = useTimers();
  const wake = useWakeLock(true);
  const recipe = all.find((item) => item.id === id);
  const [index, setIndex] = useState(0);
  const step = recipe?.steps[index] ?? '';
  const detected = detectMinutes(step);
  const [minutes, setMinutes] = useState('');

  useEffect(() => {
    setMinutes(detected ? String(detected) : '');
  }, [detected, index]);

  if (!recipe) {
    if (!loaded) return null;
    return (
      <div className="cook">
        <p>Esta receita não foi encontrada.</p>
        <a className="button" href="#/buscar">Voltar</a>
      </div>
    );
  }

  const factor = servings && recipe.servings ? servings / recipe.servings : 1;
  const last = index >= recipe.steps.length - 1;
  const timerMinutes = Number(minutes);
  const validTimer = Number.isFinite(timerMinutes) && timerMinutes > 0;

  return (
    <div className="cook">
      <div className="cook-top">
        <a className="button ghost" href={`#/receita/${id}`}>Sair</a>
        <span className="cook-progress">Passo {index + 1} de {recipe.steps.length}</span>
      </div>
      <div className="cook-name">{recipe.name}</div>
      {!wake.supported && (
        <p className="cook-warning">Este aparelho não consegue manter a tela ligada agora. Toque na tela de vez em quando para ela não apagar.</p>
      )}
      <p className="cook-step">{step}</p>
      <details className="cook-ingredients">
        <summary>Ver ingredientes</summary>
        <ul>
          {recipe.ingredients.map((ingredient, position) => (
            <li key={position}>{formatIngredient(ingredient, factor)}</li>
          ))}
        </ul>
      </details>
      {detected !== null && (
        <div className="cook-timer">
          <label className="cook-minutes">
            <span>Minutos</span>
            <input inputMode="numeric" value={minutes} onChange={(event) => setMinutes(event.target.value)} />
          </label>
          <button
            type="button"
            className="button timer-start"
            disabled={!validTimer}
            onClick={() => start(`Passo ${index + 1}`, timerMinutes)}
          >
            Iniciar temporizador de {minutes} min
          </button>
        </div>
      )}
      <div className="cook-nav">
        <button type="button" className="button ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Voltar</button>
        {last ? (
          <button type="button" className="button light" onClick={() => { window.location.hash = `#/receita/${id}`; }}>Concluir</button>
        ) : (
          <button type="button" className="button light" onClick={() => setIndex(index + 1)}>Próximo</button>
        )}
      </div>
    </div>
  );
}
