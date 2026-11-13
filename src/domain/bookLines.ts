export type TextPiece = { text: string; x: number; y: number; height: number; width: number };

/** `size` é o tamanho da letra: títulos costumam ser maiores que o texto. Zero quando não se sabe. */
export type PageLine = { text: string; size: number };

type Line = { y: number; height: number; pieces: TextPiece[] };

function joinPieces(pieces: TextPiece[]): string {
  const sorted = [...pieces].sort((a, b) => a.x - b.x);
  let text = '';
  let end = Number.NEGATIVE_INFINITY;
  for (const piece of sorted) {
    const gap = piece.x - end;
    if (text && gap > piece.height * 0.15 && !text.endsWith(' ') && !piece.text.startsWith(' ')) text += ' ';
    text += piece.text;
    end = piece.x + piece.width;
  }
  return text.replace(/\s+/g, ' ').trim();
}

function toLines(pieces: TextPiece[]): PageLine[] {
  const lines: Line[] = [];
  const ordered = [...pieces].sort((a, b) => b.y - a.y);
  for (const piece of ordered) {
    const line = lines.find((item) => Math.abs(item.y - piece.y) < Math.max(item.height, piece.height) * 0.5);
    if (line) line.pieces.push(piece);
    else lines.push({ y: piece.y, height: piece.height, pieces: [piece] });
  }
  return lines
    .sort((a, b) => b.y - a.y)
    .map((line) => ({ text: joinPieces(line.pieces), size: Math.max(...line.pieces.map((piece) => piece.height)) }))
    .filter((line) => line.text);
}

/** Quase nada atravessa o meio da página e há texto dos dois lados: são duas colunas. */
function splitColumns(pieces: TextPiece[], pageWidth: number): { full: TextPiece[]; left: TextPiece[]; right: TextPiece[] } | null {
  const middle = pageWidth / 2;
  const full = pieces.filter((piece) => piece.x < middle && piece.x + piece.width > middle);
  const left = pieces.filter((piece) => piece.x + piece.width <= middle);
  const right = pieces.filter((piece) => piece.x >= middle);
  const total = pieces.length;
  if (full.length > total * 0.1 || left.length < total * 0.2 || right.length < total * 0.2) return null;
  return { full, left, right };
}

/** O PDF guarda pedaços de texto soltos; a ordem de leitura vem da posição na página. */
export function linesFromPieces(pieces: TextPiece[], pageWidth?: number): PageLine[] {
  const written = pieces.filter((piece) => piece.text.trim());
  const columns = pageWidth ? splitColumns(written, pageWidth) : null;
  if (!columns) return toLines(written);
  const top = Math.max(...[...columns.left, ...columns.right].map((piece) => piece.y));
  const above = columns.full.filter((piece) => piece.y >= top);
  const below = columns.full.filter((piece) => piece.y < top);
  return [...toLines(above), ...toLines(columns.left), ...toLines(columns.right), ...toLines(below)];
}
