export function titleCaseSpanishDateLabel(input: string): string {
  return input
    .split(' ')
    .map((token) => {
      const clean = token.replace(/[,]/g, '');
      if (clean.toLowerCase() === 'de') return token;

      if (/^[a-záéíóúñ]/i.test(clean)) {
        const first = token.charAt(0).toUpperCase();
        return first + token.slice(1);
      }
      return token;
    })
    .join(' ');
}
