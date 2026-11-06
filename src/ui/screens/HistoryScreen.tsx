import { useEffect, useState } from 'react';
import type { RecipeVersion } from '../../storage/db';
import { listVersions, restoreVersion } from '../../storage/recipes';
import { useRecipes } from '../useRecipes';

export function HistoryScreen({ id }: { id: string }) {
  const { reload } = useRecipes();
  const [versions, setVersions] = useState<RecipeVersion[] | null>(null);

  useEffect(() => {
    void listVersions(id).then(setVersions);
  }, [id]);

  const restore = async (versionId: string) => {
    await restoreVersion(versionId);
    await reload();
    window.location.hash = `#/receita/${id}`;
  };

  return (
    <div className="stack">
      <a className="button align-start" href={`#/receita/${id}`}>Voltar à receita</a>
      <h1>Histórico de edições</h1>
      {versions?.length === 0 && <p className="muted">Ainda não há versões anteriores. Elas aparecem aqui quando você edita a receita.</p>}
      <div className="list">
        {versions?.map((version) => (
          <div className="version" key={version.id}>
            <span className="muted small">Salva até {new Date(version.savedAt).toLocaleString('pt-BR')}</span>
            <button type="button" className="button" onClick={() => void restore(version.id)}>
              Voltar à versão "{version.snapshot.name}"
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
