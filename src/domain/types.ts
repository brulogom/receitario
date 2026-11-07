export type Ingredient = {
  quantity: number | null;
  unit: string;
  name: string;
  base?: string;
};

export type RecipeKind = 'doce' | 'salgado' | 'ambos';

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
  photo?: Blob;
  createdAt: string;
  updatedAt: string;
};
