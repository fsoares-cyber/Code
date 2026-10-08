export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// valida o dígito verificador do CPF (algoritmo padrão, módulo 11).
// Não consulta nenhuma base — só confere se o número é matematicamente
// possível, não se existe de verdade ou pertence a quem o digitou.
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[10])) return false;

  return true;
}

// valida o dígito verificador do CNPJ (algoritmo padrão, módulo 11).
export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  function digit(base: string): number {
    const weights = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = base.split("").reduce((acc, d, i) => acc + Number(d) * weights[i], 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  }

  const firstCheck = digit(cnpj.slice(0, 12));
  if (firstCheck !== Number(cnpj[12])) return false;
  const secondCheck = digit(cnpj.slice(0, 13));
  if (secondCheck !== Number(cnpj[13])) return false;

  return true;
}

export function isValidDocument(value: string, personType: "FISICA" | "JURIDICA"): boolean {
  return personType === "FISICA" ? isValidCPF(value) : isValidCNPJ(value);
}

export function formatDocument(value: string, personType: "FISICA" | "JURIDICA"): string {
  const digits = onlyDigits(value);
  if (personType === "FISICA") {
    return digits
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return digits
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}
