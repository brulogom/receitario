import { singularizePhrase } from './plural';
import { normalize } from './text';

export type Aisle = 'hortifruti' | 'carnes' | 'frios' | 'padaria' | 'mercearia' | 'temperos' | 'bebidas' | 'outros';

/** Na ordem de um passeio comum pelo mercado. */
export const AISLES: [Aisle, string][] = [
  ['hortifruti', 'Hortifrúti'],
  ['carnes', 'Carnes e peixes'],
  ['frios', 'Ovos, frios e laticínios'],
  ['padaria', 'Padaria'],
  ['mercearia', 'Mercearia'],
  ['temperos', 'Temperos'],
  ['bebidas', 'Bebidas'],
  ['outros', 'Outros'],
];

export function isAisle(value: unknown): value is Aisle {
  return AISLES.some(([aisle]) => aisle === value);
}

const WORDS: Record<Exclude<Aisle, 'outros'>, string[]> = {
  hortifruti: [
    'alface', 'tomate', 'tomate cereja', 'cebola', 'alho', 'alho poro', 'batata', 'batata doce', 'cenoura', 'banana', 'maca',
    'limao', 'laranja', 'abacaxi', 'morango', 'manga', 'mamao', 'uva', 'abobrinha', 'abobora', 'berinjela', 'pimentao',
    'pepino', 'brocolis', 'couve', 'couve flor', 'repolho', 'espinafre', 'rucula', 'agriao', 'salsinha', 'salsa',
    'cebolinha', 'cheiro verde', 'coentro', 'manjericao', 'hortela', 'alecrim', 'tomilho', 'gengibre', 'mandioca', 'aipim',
    'macaxeira', 'mandioquinha', 'inhame', 'beterraba', 'chuchu', 'quiabo', 'vagem', 'cogumelo', 'champignon', 'maracuja',
    'coco', 'abacate', 'kiwi', 'pera', 'melancia', 'melao', 'goiaba', 'aspargo', 'jilo', 'maxixe', 'acelga', 'nabo',
    'rabanete', 'caqui', 'pessego', 'figo', 'tangerina', 'mexerica', 'acerola', 'caju', 'pitaya', 'framboesa', 'mirtilo',
    'milho verde', 'espiga',
  ],
  carnes: [
    'carne', 'carne moida', 'carne seca', 'frango', 'galinha', 'peito', 'coxa', 'sobrecoxa', 'asa', 'file', 'bife', 'alcatra',
    'patinho', 'picanha', 'costela', 'acem', 'musculo', 'maminha', 'fraldinha', 'cupim', 'contrafile', 'lagarto', 'coxao',
    'lombo', 'pernil', 'bisteca', 'linguica', 'bacon', 'calabresa', 'salsicha', 'peixe', 'salmao', 'tilapia', 'merluza',
    'pescada', 'bacalhau', 'camarao', 'lula', 'polvo', 'marisco', 'figado', 'coracao', 'moela', 'peru', 'chester',
    'toucinho', 'paio', 'charque', 'cordeiro', 'pato', 'hamburguer', 'almondega',
  ],
  frios: [
    'ovo', 'gema', 'clara', 'leite', 'queijo', 'manteiga', 'margarina', 'iogurte', 'requeijao', 'creme de leite', 'nata',
    'mucarela', 'mussarela', 'mozarela', 'parmesao', 'ricota', 'cream cheese', 'catupiry', 'coalhada', 'presunto',
    'peito de peru', 'mortadela', 'salame', 'provolone', 'gorgonzola', 'cottage', 'chantilly', 'massa folhada',
  ],
  padaria: ['pao', 'pao de forma', 'torrada', 'bisnaguinha', 'broa', 'baguete', 'croissant', 'sonho'],
  mercearia: [
    'arroz', 'feijao', 'farinha', 'trigo', 'acucar', 'fuba', 'amido', 'maisena', 'aveia', 'macarrao', 'espaguete', 'massa',
    'lasanha', 'talharim', 'penne', 'oleo', 'azeite', 'vinagre', 'molho', 'extrato', 'polpa', 'fermento', 'bicarbonato',
    'chocolate', 'cacau', 'achocolatado', 'cafe', 'leite condensado', 'leite de coco', 'leite em po', 'coco ralado',
    'creme de avela', 'doce de leite', 'gelatina', 'granulado', 'confeito', 'polvilho', 'tapioca', 'goma', 'milho', 'ervilha',
    'grao de bico', 'lentilha', 'castanha', 'noz', 'amendoa', 'amendoim', 'passa', 'uva passa', 'mel', 'geleia', 'biscoito',
    'bolacha', 'maionese', 'ketchup', 'mostarda', 'atum', 'sardinha', 'azeitona', 'palmito', 'alcaparra', 'granola', 'chia',
    'linhaca', 'gergelim', 'essencia', 'baunilha', 'glucose', 'farofa', 'pipoca', 'shoyu', 'cuscuz', 'quinoa', 'sagu',
    'canjica', 'soja', 'proteina de soja', 'creme de arroz', 'xarope', 'adocante', 'caldo',
  ],
  temperos: [
    'sal', 'pimenta', 'pimenta do reino', 'oregano', 'cominho', 'paprica', 'colorau', 'urucum', 'canela', 'cravo',
    'noz moscada', 'louro', 'curry', 'acafrao', 'curcuma', 'tempero', 'chimichurri', 'erva', 'ervas finas', 'lemon pepper',
    'pimenta calabresa', 'sazon', 'glutamato', 'anis', 'erva doce', 'gengibre em po',
  ],
  bebidas: ['suco', 'refrigerante', 'vinho', 'cerveja', 'cachaca', 'vodca', 'vodka', 'rum', 'conhaque', 'licor', 'agua de coco', 'agua com gas', 'cha'],
};

function words(text: string): string[] {
  return normalize(singularizePhrase(text.toLowerCase())).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter(Boolean);
}

const KEYWORDS = (Object.entries(WORDS) as [Aisle, string[]][]).flatMap(([aisle, list]) =>
  list.map((keyword) => ({ aisle, tokens: words(keyword) })),
);

/**
 * Em português o nome principal vem primeiro: "molho de tomate" é molho, "peito de frango" é carne.
 * Vale a palavra conhecida que aparece mais cedo; empatando, a expressão mais longa ("leite condensado" antes de "leite").
 */
export function aisleOf(name: string): Aisle {
  const tokens = words(name);
  let best: { aisle: Aisle; at: number; length: number } | null = null;
  for (const { aisle, tokens: keyword } of KEYWORDS) {
    for (let at = 0; at + keyword.length <= tokens.length; at++) {
      if (best && (at > best.at || (at === best.at && keyword.length <= best.length))) break;
      if (keyword.every((token, offset) => tokens[at + offset] === token)) {
        best = { aisle, at, length: keyword.length };
        break;
      }
    }
  }
  return best?.aisle ?? 'outros';
}
