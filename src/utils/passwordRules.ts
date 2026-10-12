/** Regras da senha (decisão 2026-10-12): 8+ caracteres, uma letra e um número. */
export const PASSWORD_RULE_TEXT = 'Pelo menos 8 caracteres, com letras e números.';

/** O que falta à senha; lista vazia = válida. */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('Pelo menos 8 caracteres');
  if (!/\p{L}/u.test(password)) problems.push('Pelo menos uma letra');
  if (!/\d/.test(password)) problems.push('Pelo menos um número');
  return problems;
}
