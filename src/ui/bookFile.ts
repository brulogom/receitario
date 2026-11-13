import { linesFromPieces } from '../domain/bookLines';
import type { BookPage } from '../domain/bookParser';

export class BookReadError extends Error {}

const MIN_LINES_PER_PAGE = 1;

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

async function readPdf(file: File, onProgress: (page: number, total: number) => void): Promise<BookPage[]> {
  // Só carrega o leitor de PDF quando alguém envia um livro: ele é grande.
  const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  let document;
  try {
    document = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
  } catch (problem) {
    if ((problem as Error).name === 'PasswordException') {
      throw new BookReadError('Este PDF tem senha. Abra-o sem senha e envie de novo.');
    }
    throw new BookReadError('Não foi possível abrir este arquivo. Confira se é um PDF inteiro.');
  }
  const pages: BookPage[] = [];
  for (let number = 1; number <= document.numPages; number++) {
    onProgress(number, document.numPages);
    const page = await document.getPage(number);
    const content = await page.getTextContent();
    const pieces = content.items.flatMap((item) =>
      'str' in item
        ? [{ text: item.str, x: item.transform[4], y: item.transform[5], height: Math.abs(item.transform[3]) || item.height, width: item.width }]
        : [],
    );
    pages.push({ page: number, lines: linesFromPieces(pieces, page.getViewport({ scale: 1 }).width) });
    page.cleanup();
  }
  await document.destroy();
  const lines = pages.reduce((total, page) => total + page.lines.length, 0);
  if (lines < pages.length * MIN_LINES_PER_PAGE) {
    throw new BookReadError('Este PDF não tem texto: as páginas são imagens, como em um livro escaneado ou fotografado. Por enquanto, só consigo ler PDF com texto selecionável ou arquivo TXT.');
  }
  return pages;
}

/** O arquivo é lido aqui mesmo, no aparelho, e não é guardado nem enviado para lugar nenhum. */
export async function readBookFile(file: File, onProgress: (page: number, total: number) => void = () => {}): Promise<BookPage[]> {
  if (isPdf(file)) return readPdf(file, onProgress);
  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => ({ text: line, size: 0 }));
  if (lines.length === 0) throw new BookReadError('Este arquivo está vazio.');
  return [{ page: null, lines }];
}
