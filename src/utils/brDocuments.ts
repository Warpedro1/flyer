/**
 * CPF e celular (decisões 2026-10-12). O backend volta a validar e normaliza; aqui só se
 * ajuda quem escreve (máscara) e se avisa antes de enviar.
 */

const digits = (value: string) => value.replace(/\D/g, '');

function cpfCheckDigit(base: string): number {
  const weight = base.length + 1;
  const total = [...base].reduce((sum, d, i) => sum + Number(d) * (weight - i), 0);
  const rest = (total * 10) % 11;
  return rest === 10 ? 0 : rest;
}

export function isValidCpf(value: string): boolean {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  return cpfCheckDigit(cpf.slice(0, 9)) === Number(cpf[9]) && cpfCheckDigit(cpf.slice(0, 10)) === Number(cpf[10]);
}

/** Celular brasileiro: DDD (sem zeros) + 9 + 8 dígitos. */
export function isValidMobile(value: string): boolean {
  let d = digits(value);
  if (d.length === 13 && d.startsWith('55')) d = d.slice(2);
  return /^[1-9]{2}9\d{8}$/.test(d);
}

/** 529.982.247-25 */
export function formatCpfInput(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** (81) 91234-5678 */
export function formatPhoneInput(value: string): string {
  const d = digits(value).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Problemas do CPF e do celular, para mostrar antes de enviar. */
export function identityProblems(cpf: string, phone: string): string[] {
  const problems: string[] = [];
  if (!isValidCpf(cpf)) problems.push('CPF inválido');
  // O celular é opcional (Warpedro1/flyer-back#29); se vier, continua validado.
  if (phone.trim() && !isValidMobile(phone)) problems.push('Celular inválido: DDD + número com 9 dígitos');
  return problems;
}
