export type CertificationStatus = "VALIDO" | "VENCE_EM_BREVE" | "VENCIDO";

// antecedência configurável do alerta de vencimento
export const EXPIRY_WARNING_THRESHOLDS_DAYS = [90, 60, 30] as const;

export function daysUntil(date: Date, now: Date = new Date()): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.ceil((date.getTime() - now.getTime()) / msPerDay);
}

export function certificationStatus(
  expiryDate: Date,
  now: Date = new Date(),
): CertificationStatus {
  const days = daysUntil(expiryDate, now);
  if (days < 0) return "VENCIDO";
  if (days <= EXPIRY_WARNING_THRESHOLDS_DAYS[0]) return "VENCE_EM_BREVE";
  return "VALIDO";
}

export function isSupplierRegular(certifications: { expiryDate: Date; isCurrent: boolean }[], qualificationStatus: string, now: Date = new Date()): boolean {
  if (qualificationStatus !== "QUALIFICADO") return false;
  const current = certifications.filter((c) => c.isCurrent);
  return current.every((c) => certificationStatus(c.expiryDate, now) !== "VENCIDO");
}
