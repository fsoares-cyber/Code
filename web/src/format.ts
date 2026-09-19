export function formatCurrency(value: number | string, currency: "BRL" | "USD" = "BRL"): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
  }).format(n);
}

export function formatDate(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export function formatNumber(value: number | string, digits = 2): string {
  const n = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: digits }).format(n);
}
