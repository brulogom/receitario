import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
// @ts-expect-error o projeto não inclui os tipos do Node: este arquivo só roda nos testes.
import { Blob as NodeBlob } from 'node:buffer';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// O Blob do jsdom não tem arrayBuffer(), que existe em todos os navegadores atuais.
globalThis.Blob = NodeBlob as unknown as typeof Blob;

afterEach(() => cleanup());
