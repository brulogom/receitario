import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
// @ts-expect-error o projeto não inclui os tipos do Node: este arquivo só roda nos testes.
import { Blob as NodeBlob } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// O aplicativo publicado começa sem receitas prontas; os testes usam dados próprios, que não vão para o site.
vi.mock('./catalog', async () => {
  const { doces } = await import('./test-fixtures/doces');
  const { salgados } = await import('./test-fixtures/salgados');
  return { catalog: [...doces, ...salgados] };
});

// O Blob do jsdom não tem arrayBuffer(), que existe em todos os navegadores atuais.
globalThis.Blob = NodeBlob as unknown as typeof Blob;

afterEach(() => cleanup());
