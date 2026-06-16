import { ClaimTask, Dimension, Source } from "./types";

export type SourceDomainClass =
  | "gov_vn"
  | "intl_org"
  | "academic"
  | "social_or_blog"
  | "pdf_only"
  | "general"
  | "unknown";

export type SourceAccessStatusValue = "" | "source_text_parsed" | "inaccessible" | "unknown";

export const SOURCE_ACCESS_OPTIONS: { value: SourceAccessStatusValue; label: string }[] = [
  { value: "", label: "--- Chọn trạng thái nguồn ---" },
  { value: "source_text_parsed", label: "source_text_parsed — Text đã parse từ PDF, đối chiếu được" },
  { value: "inaccessible", label: "inaccessible — Không truy cập / không đối chiếu được nguồn" },
];

export const SQ_UNKNOWN_TIER_THRESHOLD = 0.75;
export const SCORE_DELTA_THRESHOLD = 0.2;

const TIER_SCORES: Record<string, number> = {
  "Tier 1": 0.92,
  "Tier 2": 0.82,
  "Tier 3": 0.62,
  "Tier 4": 0.37,
  unknown: 0.6,
};

const DOMAIN_FLOORS: Partial<Record<SourceDomainClass, number>> = {
  gov_vn: 0.8,
  intl_org: 0.85,
  academic: 0.75,
};

const DOMAIN_CAPS: Partial<Record<SourceDomainClass, number>> = {
  social_or_blog: 0.49,
};

const GOV_DOMAINS = new Set(["chinhphu.vn", "vbpl.vn", "thuvienphapluat.vn"]);
const INTL_DOMAINS = new Set(["worldbank.org", "oecd.org", "imf.org", "who.int"]);
const SOCIAL_DOMAINS = new Set(["facebook.com", "tiktok.com", "youtube.com"]);

export const DOMAIN_CLASS_LABELS: Record<SourceDomainClass, string> = {
  gov_vn: "Cơ quan nhà nước (.gov.vn)",
  intl_org: "Tổ chức quốc tế",
  academic: "Học thuật (.edu)",
  social_or_blog: "Mạng xã hội / blog",
  pdf_only: "Chỉ có PDF (không URL)",
  general: "Domain thông thường",
  unknown: "Chưa xác định",
};

export function normalizeTier(tier: string): string {
  const t = tier.trim();
  if (!t || /^unknown$/i.test(t)) return "unknown";
  if (/^tier\s*1$/i.test(t)) return "Tier 1";
  if (/^tier\s*2$/i.test(t)) return "Tier 2";
  if (/^tier\s*3$/i.test(t)) return "Tier 3";
  if (/^tier\s*4$/i.test(t) || /blog/i.test(t)) return "Tier 4";
  return t;
}

export function classifyDomain(url: string | null): SourceDomainClass {
  if (!url) return "pdf_only";

  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.endsWith(".gov.vn") || [...GOV_DOMAINS].some((d) => host.includes(d))) {
      return "gov_vn";
    }
    if ([...INTL_DOMAINS].some((d) => host.includes(d))) {
      return "intl_org";
    }
    if (host.includes(".edu") || host.endsWith(".ac.vn") || host.includes(".edu.")) {
      return "academic";
    }
    if ([...SOCIAL_DOMAINS].some((d) => host.includes(d))) {
      return "social_or_blog";
    }
    return "general";
  } catch {
    return "unknown";
  }
}

export function computeSqPrescore(source: Source) {
  const tier = normalizeTier(source.tier);
  const domainClass = source.domainClass ?? classifyDomain(source.url);
  const parseStatus = source.parseStatus;

  let base = TIER_SCORES[tier] ?? TIER_SCORES.unknown;
  const floor = DOMAIN_FLOORS[domainClass];
  const cap = DOMAIN_CAPS[domainClass];

  if (floor !== undefined && tier !== "Tier 4") {
    base = Math.max(base, floor);
  }
  if (cap !== undefined) {
    base = Math.min(base, cap);
  }
  if (parseStatus === "unparsed" || parseStatus === "failed" || parseStatus === "ocr_required") {
    base = Math.min(base, 0.49);
  }

  const sq = Math.round(base * 100) / 100;
  const needsReview = tier === "unknown" || parseStatus === "unparsed" || parseStatus === "failed";

  return {
    sq,
    sqRationale: `SQ rule: tier=${tier}, domain=${domainClass}, parse=${parseStatus} → ${sq.toFixed(2)}`,
    sqSignalsUsed: ["source_tier", "source_domain_class", "source_parse_status"] as const,
    domainClass,
    needsReview,
    tierNormalized: tier,
  };
}

export function enrichSource(source: Source): Source {
  const domainClass = source.domainClass ?? classifyDomain(source.url);
  const sqMeta = computeSqPrescore({ ...source, domainClass });
  return {
    ...source,
    domainClass,
    sqPrescore: sqMeta.sq,
    sqRationale: sqMeta.sqRationale,
    sqNeedsReview: sqMeta.needsReview,
    tierNormalized: sqMeta.tierNormalized,
  };
}

export function enrichClaimTask(task: ClaimTask): ClaimTask {
  const sources = (task.sources || []).map(enrichSource);
  const mapped = sources.filter((s) => task.mappedSourceOrders.includes(s.order));
  const sqValues = mapped.length
    ? mapped.map((s) => s.sqPrescore ?? computeSqPrescore(s).sq)
    : [computeSqPrescore({ order: 0, title: "", tier: "unknown", url: null, file: "", parseStatus: "parsed", text: "" }).sq];

  const claimSqPrescore = Math.round((sqValues.reduce((a, b) => a + b, 0) / sqValues.length) * 100) / 100;

  return {
    ...task,
    sources,
    pre: { ...task.pre, SQ: claimSqPrescore },
    sqRationale: mapped.map((s) => `[${s.order}] ${s.sqRationale}`).join(" · "),
    sqEngine: "rule",
  };
}

export function hasUnknownMappedTier(task: ClaimTask): boolean {
  return (task.sources || [])
    .filter((s) => task.mappedSourceOrders.includes(s.order))
    .some((s) => normalizeTier(s.tier) === "unknown");
}

export function needsSqUnknownNote(task: ClaimTask, annSq: number, sourceNote: string, reason: string): boolean {
  if (!hasUnknownMappedTier(task)) return false;
  if (annSq < SQ_UNKNOWN_TIER_THRESHOLD) return false;
  return !sourceNote.trim() && !reason.trim();
}

export function isScLocked(sourceStatus: string): boolean {
  return sourceStatus === "inaccessible";
}

export function dimensionLabel(dim: Dimension): string {
  if (dim === "SQ") return "SQ (Rule Engine)";
  return dim;
}

export const SQ_RUBRIC_PDF_NATIVE = [
  { band: "0.90 – 1.00", desc: "Tier 1 + domain chính phủ/quốc tế + source text parsed đầy đủ" },
  { band: "0.75 – 0.89", desc: "Tier 1–2 + source text parsed, domain chưa xác minh live" },
  { band: "0.50 – 0.74", desc: "Tier 3 hoặc tier unknown, có source text từ PDF" },
  { band: "0.25 – 0.49", desc: "Tier 4/blog HOẶC source unparsed/inaccessible" },
  { band: "0.00 – 0.24", desc: "Không có source text + tier unknown" },
];
