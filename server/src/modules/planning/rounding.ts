/**
 * Aplica lote mínimo e múltiplo de compra, arredondando para cima.
 * Ex.: precisando de 1.100 com mínimo 1.000 e múltiplo 250 -> compra 1.250.
 * O lote mínimo é o piso; o múltiplo é o incremento de embalagem acima dele.
 */
export function roundToLotAndMultiple(need: number, minLotSize: number, purchaseMultiple: number): number {
  if (need <= 0) return 0;
  const base = Math.max(need, minLotSize);
  const excess = base - minLotSize;
  const multiple = purchaseMultiple > 0 ? purchaseMultiple : 1;
  const roundedExcess = Math.ceil(round6(excess) / multiple) * multiple;
  return round6(minLotSize + roundedExcess);
}

// evita ruído de ponto flutuante em quantidades
export function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
