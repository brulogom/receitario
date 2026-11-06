export function isHttpUrl(text: string): boolean {
  return /^https?:\/\/\S+$/i.test(text.trim());
}

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
