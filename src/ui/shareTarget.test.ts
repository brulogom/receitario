import { readShare } from './shareTarget';

test('sem parâmetros retorna null', () => {
  expect(readShare('')).toBeNull();
  expect(readShare('?outra=1')).toBeNull();
});

test('compartilhamento só com link preenche o vídeo e nada mais', () => {
  expect(readShare('?url=https%3A%2F%2Fwww.tiktok.com%2F%40a%2Fvideo%2F1')).toEqual({
    recipe: { videoUrl: 'https://www.tiktok.com/@a/video/1' },
    leftovers: [],
  });
});

test('link dentro do campo text é separado do texto', () => {
  const share = readShare(`?text=${encodeURIComponent('https://instagram.com/p/abc')}`);
  expect(share).toEqual({ recipe: { videoUrl: 'https://instagram.com/p/abc' }, leftovers: [] });
});

test('texto com link no meio mantém os dois', () => {
  const share = readShare(`?text=${encodeURIComponent('Olha essa receita https://vm.tiktok.com/xyz')}`);
  expect(share?.recipe.videoUrl).toBe('https://vm.tiktok.com/xyz');
  expect(share?.leftovers).toEqual(['Olha essa receita']);
});

test('texto de legenda passa pelo leitor de receitas', () => {
  const caption = 'Bolo 😍\nIngredientes\n2 ovos\nPreparo\nMisture\n#bolo';
  const share = readShare(`?text=${encodeURIComponent(caption)}`);
  expect(share?.recipe).toEqual({
    name: 'Bolo 😍',
    ingredients: [{ quantity: 2, unit: '', name: 'ovos' }],
    steps: ['Misture'],
  });
  expect(share?.leftovers).toEqual(['#bolo']);
});

test('título vira nome se o texto não trouxer um', () => {
  const share = readShare('?title=Bolo%20da%20Vov%C3%B3&url=https%3A%2F%2Fa.com');
  expect(share?.recipe).toEqual({ name: 'Bolo da Vovó', videoUrl: 'https://a.com' });
});

test('endereço que não é http não vira link', () => {
  const share = readShare(`?url=${encodeURIComponent('javascript:alert(1)')}`);
  expect(share).toEqual({ recipe: {}, leftovers: ['javascript:alert(1)'] });
});
