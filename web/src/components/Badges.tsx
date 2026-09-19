import type { CertificationStatus, QualificationStatus, SupplierStatus } from "../types";

export function CertificationStatusBadge({ status }: { status: CertificationStatus }) {
  const map: Record<CertificationStatus, { label: string; cls: string }> = {
    VALIDO: { label: "Válido", cls: "badge-success" },
    VENCE_EM_BREVE: { label: "Vence em breve", cls: "badge-warning" },
    VENCIDO: { label: "Vencido", cls: "badge-danger" },
  };
  const { label, cls } = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function QualificationBadge({ status }: { status: QualificationStatus }) {
  const map: Record<QualificationStatus, { label: string; cls: string }> = {
    QUALIFICADO: { label: "Qualificado", cls: "badge-success" },
    EM_QUALIFICACAO: { label: "Em qualificação", cls: "badge-warning" },
    REPROVADO: { label: "Reprovado", cls: "badge-danger" },
  };
  const { label, cls } = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function SupplierStatusBadge({ status }: { status: SupplierStatus }) {
  const map: Record<SupplierStatus, { label: string; cls: string }> = {
    ATIVO: { label: "Ativo", cls: "badge-success" },
    INATIVO: { label: "Inativo", cls: "badge-neutral" },
    BLOQUEADO: { label: "Bloqueado", cls: "badge-danger" },
  };
  const { label, cls } = map[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
