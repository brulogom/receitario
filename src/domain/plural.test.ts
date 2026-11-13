import { pluralizePhrase, singularizePhrase } from './plural';

test.each([
  ['ovo', 'ovos'],
  ['limão', 'limões'],
  ['pão', 'pães'],
  ['pão francês', 'pães franceses'],
  ['maçã', 'maçãs'],
  ['mão', 'mãos'],
  ['cebola roxa', 'cebolas roxas'],
  ['pimentão verde', 'pimentões verdes'],
  ['dente de alho', 'dentes de alho'],
  ['pão de queijo', 'pães de queijo'],
  ['quindim', 'quindins'],
  ['pastel', 'pastéis'],
  ['colher', 'colheres'],
  ['sacolé', 'sacolés'],
  ['docinho', 'docinhos'],
  ['pessoa', 'pessoas'],
  ['brócolis', 'brócolis'],
])('%s <-> %s', (one, many) => {
  expect(pluralizePhrase(one)).toBe(many);
  expect(singularizePhrase(many)).toBe(one);
  // Passar pela regra duas vezes não estraga a palavra.
  expect(pluralizePhrase(many)).toBe(many);
  expect(singularizePhrase(one)).toBe(one);
});
