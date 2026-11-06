import { normalize } from './text';

test('normalize remove acentos, maiúsculas e espaços extras', () => {
  expect(normalize('  AÇÚCAR  Mascavo ')).toBe('acucar mascavo');
});
