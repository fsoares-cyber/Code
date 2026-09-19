export type SupplierOrigin = "NACIONAL" | "IMPORTADO";
export type SupplierStatus = "ATIVO" | "INATIVO" | "BLOQUEADO";
export type QualificationStatus = "QUALIFICADO" | "EM_QUALIFICACAO" | "REPROVADO";
export type Incoterm = "EXW" | "FCA" | "FOB" | "CFR" | "CIF" | "DAP" | "DDP";
export type PaymentTerm = "ANTECIPADO" | "DIAS_30" | "DIAS_30_60" | "DIAS_30_60_90";
export type CertificationStatus = "VALIDO" | "VENCE_EM_BREVE" | "VENCIDO";

export interface SupplierContact {
  id: string;
  name: string;
  role?: string | null;
  email: string;
  phone?: string | null;
  receivesQuotation: boolean;
}

export interface Certification {
  id: string;
  type: string;
  number: string;
  issuer: string;
  issueDate: string;
  expiryDate: string;
  fileUrl?: string | null;
  isCurrent: boolean;
  status: CertificationStatus;
  previousVersionId?: string | null;
}

export interface Supplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string | null;
  taxId: string;
  origin: SupplierOrigin;
  country: string;
  address?: string | null;
  status: SupplierStatus;
  currency: string;
  paymentTerm: PaymentTerm;
  incoterm?: Incoterm | null;
  avgLeadTimeDays?: number | null;
  qualificationStatus: QualificationStatus;
  qualificationLastReview?: string | null;
  qualificationNextReview?: string | null;
  contacts: SupplierContact[];
  certifications: Certification[];
  isRegular: boolean;
  componentSuppliers?: ComponentSupplier[];
}

export interface Component {
  id: string;
  internalCode: string;
  description: string;
  category?: string | null;
  technicalSpec?: string | null;
  usageUnit: string;
  ncm?: string | null;
  critical: boolean;
  active: boolean;
  componentSuppliers?: ComponentSupplier[];
}

export interface ComponentSupplierPriceHistory {
  id: string;
  unitPrice: string;
  currency: string;
  priceDate: string;
  priceValidUntil: string;
  replacedAt: string;
}

export interface ComponentSupplier {
  id: string;
  componentId: string;
  supplierId: string;
  supplier: Supplier;
  component?: Component;
  supplierPartNumber: string;
  unitPrice: string;
  currency: string;
  salesUnit: string;
  conversionFactorToUsageUnit: string;
  minLotSize: string;
  purchaseMultiple: string;
  leadTimeDays: number;
  priceDate: string;
  priceValidUntil: string;
  preferred: boolean;
  notes?: string | null;
  priceHistory?: ComponentSupplierPriceHistory[];
}

export interface BomItem {
  id: string;
  componentId: string;
  component?: Component;
  qtyPerUnit: string;
  lossPercent: string;
}

export interface BomRevision {
  id: string;
  revisionNumber: number;
  effectiveDate: string;
  isCurrent: boolean;
  items: BomItem[];
}

export interface Bom {
  id: string;
  productCode: string;
  description: string;
  active: boolean;
  revisions: BomRevision[];
}

export type ScenarioHorizon = "TRIMESTRAL" | "SEMESTRAL" | "ANUAL";
export type ScenarioStatus = "RASCUNHO" | "APROVADO" | "COTADO" | "REVISADO";

export interface Period {
  id: string;
  scenarioId: string;
  label: string;
  startDate: string;
  endDate: string;
  sequence: number;
}

export interface Scenario {
  id: string;
  name: string;
  horizon: ScenarioHorizon;
  startDate: string;
  exchangeRateUsdBrl: string;
  status: ScenarioStatus;
  approvedAt?: string | null;
  periods: Period[];
}

export interface ProductionLine {
  id: string;
  scenarioId: string;
  bomId: string;
  bom: Bom;
  periodId: string;
  period: Period;
  quantity: string;
  notes?: string | null;
}

export interface PurchasePlanItem {
  id: string;
  scenarioId: string;
  periodId: string;
  period: Period;
  componentId: string;
  component: Component;
  componentSupplierId: string;
  componentSupplier: ComponentSupplier;
  quantitySalesUnit: string;
  rawNeedUsageUnit: string;
  carriedOverQty: string;
  surplusToNextPeriod: string;
  unitCost: string;
  currency: string;
  costBRL: string;
  deadlineDate: string;
  outOfHorizon: boolean;
  plannedCost?: string | null;
  quotedCost?: string | null;
  sourceLmcCodes: string[];
}

export type AlertType =
  | "FORA_DO_HORIZONTE"
  | "SUGESTAO_CONSOLIDACAO"
  | "PRECO_DESATUALIZADO"
  | "FORNECEDOR_IRREGULAR";

export interface Alert {
  id: string;
  scenarioId: string;
  type: AlertType;
  componentId?: string | null;
  component?: Component | null;
  periodId?: string | null;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ScenarioSummary {
  byPeriod: { periodId: string; label: string; sequence: number; totalBRL: number }[];
  byLmc: { lmcCode: string; totalBRL: number }[];
  bySupplier: { supplierId: string; name: string; totalBRL: number }[];
  totalBRL: number;
  exposureUSD: number;
  exchangeRateUsdBrl: number;
}
