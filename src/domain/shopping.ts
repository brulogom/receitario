import { singularizePhrase } from './plural';
import { formatIngredient } from './portions';
import { normalize } from './text';
import type { Ingredient, Recipe } from './types';

/** Unidades conversíveis ficam na menor delas; as demais só somam com a mesma unidade. */
const CONVERT: Record<string, { family: string; factor: number }> = {
  g: { family: 'g', factor: 1 },
  kg: { family: 'g', factor: 1000 },
  ml: { family: 'ml', factor: 1 },
  l: { family: 'ml', factor: 1000 },
};

const LARGER: Record<string, string> = { g: 'kg', ml: 'l' };

const UNKNOWN_AMOUNT = 'quantidade não informada';

type Line = {
  nameKey: string;
  name: string;
  unit: string;
  quantity: number | null;
  quantityMax: number | null;
  /** Alguma receita pede este ingrediente sem dizer quanto. */
  missingAmount: boolean;
  /** A unidade em que foi escrito; null quando se somaram unidades diferentes. */
  writtenUnit: string | null;
};

/** Só é a mesma coisa com o mesmo nome: peito de frango e sobrecoxa não se somam. */
function sameThingKey(name: string): string {
  return normalize(singularizePhrase(name.toLowerCase()));
}

function display({ name, unit, quantity, quantityMax, writtenUnit }: Line): string {
  const large = LARGER[unit];
  // 0,05 l continua 0,05 l: só muda para a unidade maior quando a soma chega a ela.
  const useLarge = quantity !== null && large && (writtenUnit === large || quantity >= 1000);
  const scale = useLarge ? 1000 : 1;
  const ingredient: Ingredient = {
    name,
    unit: useLarge ? large : unit,
    quantity: quantity === null ? null : quantity / scale,
    ...(quantityMax !== null && quantityMax !== quantity ? { quantityMax: quantityMax / scale } : {}),
  };
  return formatIngredient(ingredient);
}

function label(line: Line): string {
  if (line.quantity === null) return line.unit ? display(line) : `${line.name} (${UNKNOWN_AMOUNT})`;
  return line.missingAmount ? `${display(line)} + ${UNKNOWN_AMOUNT}` : display(line);
}

export function buildShoppingList(
  selections: { recipe: Recipe; servings: number | null }[],
): { key: string; label: string }[] {
  const lines = new Map<string, Line>();
  for (const { recipe, servings } of selections) {
    const factor = servings && recipe.servings ? servings / recipe.servings : 1;
    for (const ingredient of recipe.ingredients) {
      const conversion = CONVERT[ingredient.unit];
      const unit = conversion?.family ?? ingredient.unit;
      const nameKey = sameThingKey(ingredient.name);
      const key = `${nameKey}|${unit}`;
      const scale = factor * (conversion?.factor ?? 1);
      const amount = ingredient.quantity === null ? null : ingredient.quantity * scale;
      const amountMax = ingredient.quantity === null ? null : (ingredient.quantityMax ?? ingredient.quantity) * scale;
      const line = lines.get(key);
      if (!line) {
        lines.set(key, { nameKey, name: ingredient.name, unit, quantity: amount, quantityMax: amountMax, missingAmount: false, writtenUnit: ingredient.unit });
      } else if (amount === null || amountMax === null) {
        line.missingAmount = line.missingAmount || !unit;
      } else if (line.quantity === null) {
        line.quantity = amount;
        line.quantityMax = amountMax;
        line.name = ingredient.name;
        line.missingAmount = !unit;
        line.writtenUnit = ingredient.unit;
      } else {
        line.quantity += amount;
        line.quantityMax = (line.quantityMax ?? line.quantity) + amountMax;
        if (line.writtenUnit !== ingredient.unit) line.writtenUnit = null;
      }
    }
  }
  // "ovos" sem medida junto de "3 xícaras de ovos": a falta de quantidade aparece na linha que tem quantidade.
  for (const [key, line] of lines) {
    if (line.quantity !== null || line.unit) continue;
    const withAmount = [...lines.values()].find((other) => other.nameKey === line.nameKey && other.quantity !== null);
    if (withAmount) {
      withAmount.missingAmount = true;
      lines.delete(key);
    }
  }
  return [...lines].map(([key, line]) => ({ key, label: label(line) }));
}
