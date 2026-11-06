import type { Recipe } from '../domain/types';
import { doces } from './doces';
import { salgados } from './salgados';

export const catalog: Recipe[] = [...doces, ...salgados];
