export type Ingredient = {
  quantity: number | null;
  /** Fim da faixa em "2 a 3 ovos". */
  quantityMax?: number;
  unit: string;
  name: string;
  base?: string;
};

export type RecipeKind = 'doce' | 'salgado' | 'ambos' | 'indefinido';

export type Category =
  | 'doces'
  | 'bolos'
  | 'massas'
  | 'carnes'
  | 'aves'
  | 'peixes'
  | 'arroz e feijão'
  | 'salgadinhos'
  | 'vegetariano'
  | 'bebidas';

export type Diet = {
  vegetarian: boolean;
  lactoseFree: boolean;
  glutenFree: boolean;
};

export type Recipe = {
  id: string;
  source: 'catalog' | 'mine';
  originId?: string;
  name: string;
  kind: RecipeKind;
  categories: Category[];
  diet: Diet;
  minutes: number | null;
  servings: number | null;
  /** O que `servings` conta, no plural: "pessoas", "docinhos", "fatias". Sem valor, conta pessoas. */
  servingsUnit?: string;
  ingredients: Ingredient[];
  steps: string[];
  notes: string;
  videoUrl: string;
  /** Livro de onde a receita veio, enviado pela pessoa. */
  book?: { title: string; page: number | null };
  photo?: Blob;
  createdAt: string;
  updatedAt: string;
};
