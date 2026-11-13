import { useState, type ChangeEvent } from 'react';
import { InvalidBackupError, exportBackup, importBackup } from '../../storage/backup';
import { RecipeRow } from '../RecipeRow';
import { useRecipes } from '../useRecipes';

function downloadBackup(json: string) {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `receitario-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function MineScreen() {
  const { mine, loaded, reload } = useRecipes();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    setError('');
    try {
      const { added, updated, kept } = await importBackup(await file.text());
      await reload();
      setMessage(`Backup importado: ${added} nova(s), ${updated} atualizada(s), ${kept} mantida(s). Nada foi apagado.`);
    } catch (problem) {
      setError(problem instanceof InvalidBackupError ? problem.message : 'Não foi possível ler este arquivo.');
    }
  };

  return (
    <div className="stack">
      <h1>Minhas Receitas</h1>
      <div className="actions">
        <a className="button primary grow" href="#/nova">Nova receita</a>
        <a className="button grow" href="#/importar">Colar texto</a>
        <a className="button grow" href="#/livro">Enviar livro</a>
      </div>
      {loaded && mine.length === 0 && (
        <p className="muted">Você ainda não guardou nenhuma receita. Toque em Nova receita para anotar a primeira.</p>
      )}
      <div className="list">
        {mine.map((recipe) => (
          <RecipeRow key={recipe.id} recipe={recipe} />
        ))}
      </div>
      <section className="backup">
        <h2>Backup</h2>
        <p className="muted small">Suas receitas ficam só neste aparelho. Faça backup para não perdê-las e para levá-las a outro aparelho.</p>
        <div className="actions">
          <button type="button" className="button" onClick={() => void exportBackup().then(downloadBackup)}>Fazer backup</button>
          <label className="button">
            Importar backup
            <input className="visually-hidden" type="file" accept="application/json,.json" onChange={(event) => void onImport(event)} />
          </label>
        </div>
        {message && <p className="info" role="status">{message}</p>}
        {error && <p className="error" role="alert">{error}</p>}
      </section>
    </div>
  );
}
