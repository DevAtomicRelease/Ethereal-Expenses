/**
 * AtomicShift v3.0 — API Response Types
 * ═══════════════════════════════
 * These types match the EXACT shapes returned by the FastAPI backend.
 * Any change to a backend schema MUST be reflected here.
 */

// ── Category enum (25 values matching VALID_CATEGORIES in models.py) ──
export type Category =
  | "food" | "groceries" | "transport" | "shopping" | "entertainment"
  | "health" | "education" | "utilities" | "rent" | "subscriptions"
  | "travel" | "alcohol" | "dining_out" | "coffee" | "personal_care"
  | "electronics" | "clothing" | "gifts" | "charity" | "fitness"
  | "fuel" | "insurance" | "emi" | "recharge" | "misc";

// ═══════════════════════════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════════════════════════
export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  email: string;
}

// ═══════════════════════════════════════════════════════════════════════
// EXPENSES
// ═══════════════════════════════════════════════════════════════════════

/** Single expense object returned by backend. */
export interface ExpenseResponse {
  id: string;
  amount: number;
  category: string;
  description?: string;
  timestamp: string;
  source?: string;
  anomaly_flag?: boolean;
}

/** POST /expense request body. */
export interface ExpenseCreate {
  amount: number;
  category: string;
  description?: string;
  timestamp: string;
}

/** PUT /expenses/{id} request body. */
export interface ExpenseUpdate {
  amount?: number;
  category?: string;
  description?: string;
  timestamp?: string;
}

/**
 * GET /expenses response.
 * Backend key is "transactions", NOT "expenses".
 */
export interface ExpenseListResponse {
  transactions: ExpenseResponse[];
  total: number;
  page: number;
  limit: number;
}

/** POST /expenses/batch response. */
export interface BatchResult {
  imported: number;
  duplicates: number;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════
// INTELLIGENCE — GET /intelligence
// ═══════════════════════════════════════════════════════════════════════

/** Returned when user has fewer than MIN_TRANSACTIONS. */
export interface InsufficientDataResponse {
  status: "insufficient_data";
  txn_count: number;
  required: number;
  progress_pct: number;
}

/** Compressed signals payload nested inside IntelligenceResponse.compressed_signals */
export interface CompressedSignals {
  // Brain summary
  txn_count: number;
  median_txn: number;
  mean_txn: number;
  spend_std: number;
  cv_ratio: number;
  rolling_7d_avg: number;
  rolling_30d_avg: number;
  txn_frequency_weekly: number;
  acceleration: number;
  top_categories: string[];
  category_distribution: Record<string, number>;
  time_pattern: Record<string, number>;
  time_pattern_label: string;
  social_ratio: number;
  discretionary_ratio: number;

  // Identity
  primary_identity: string;
  secondary_identities: string[];
  identity_traits: string[];
  identity_confidence: number;
  impulsivity_index: number;
  self_control_score: number;
  identity_stability: string;

  // Anomaly
  anomalies_detected: boolean;
  anomaly_count: number;
  anomaly_types: string[];
  anomaly_severity: string;
  anomaly_recurrence: boolean;

  // Shift
  shift_detected: boolean;
  shift_type: string;
  shift_magnitude_pct: number;
  category_rotation: boolean;

  // Momentum
  momentum_direction: string;
  category_drift: string;
  spending_velocity: string;
  spend_velocity_daily: number;
  reversal_signal: boolean;
  projection_30d: number;

  // Lifestyle
  lifestyle_signals: string[];
  primary_lifestyle: string;
  food_personality: string;
  social_pattern: string;

  // Risk
  risk_score: number;
  risk_level: string;
  risk_flags: Record<string, boolean>;
  risk_drivers: string[];

  // Threshold
  threshold_daily: number;
  threshold_weekly: number;
  threshold_monthly: number;

  // Compressor metadata
  conflict_flags: string[];
  conflict_details: Array<{ conflict: string; hint: string }>;
  narrative_focus_hints: string[];
  data_maturity: string;
  signal_confidence: number;
}

/** GET /intelligence — full pipeline response. */
export interface IntelligenceResponse {
  narrative: string;
  reasoning: string | null;
  compressed_signals: CompressedSignals;
  data_maturity: string;
  signal_confidence: number;
  cached_at: string;
  model_unavailable: boolean;
  /** Only present on error responses */
  status?: string;
  detail?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// INSIGHTS — GET /insights
// ═══════════════════════════════════════════════════════════════════════

/** Statistical summaries (no LLM). */
export interface InsightResponse {
  category_breakdown: Record<string, number>;
  weekly_averages: Record<string, number>;
  time_pattern: Record<string, number>;
  total_spend_90d: number;
  txn_count_90d: number;
  data_maturity: string;
}

// ═══════════════════════════════════════════════════════════════════════
// ANOMALIES — GET /anomalies
// ═══════════════════════════════════════════════════════════════════════

export interface AnomalyItem {
  anomaly_type: string;
  severity: string;
  transaction_id: string | null;
  details: Record<string, any>;
}

export interface AnomalyResponse {
  anomalies_detected: boolean;
  anomaly_count: number;
  anomalies: AnomalyItem[];
  anomaly_severity?: string;
  anomaly_types?: string[];
  recurrence_flag: boolean;
  disabled_reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// BEHAVIOR — GET /behavior
// ═══════════════════════════════════════════════════════════════════════

export interface BehaviorResponse {
  shift_detected: boolean;
  shift_type: string;
  shift_magnitude_pct: number;
  category_rotation: boolean;
  new_categories: string[];
  dropped_categories: string[];
  time_pattern_shift: boolean;
  current_30d_avg: number;
  prior_60d_avg: number;
}

// ═══════════════════════════════════════════════════════════════════════
// RISK — GET /risk
// ═══════════════════════════════════════════════════════════════════════

export interface RiskResponse {
  risk_score: number;
  risk_level: string;
  risk_flags: Record<string, boolean>;
  risk_drivers: string[];
  risk_trend: string | null;
}

// ═══════════════════════════════════════════════════════════════════════
// MOMENTUM — GET /momentum
// ═══════════════════════════════════════════════════════════════════════

export interface MomentumResponse {
  velocity: number;
  velocity_30d: number;
  acceleration: number;
  direction: string;
  spending_velocity: string;
  spend_velocity_daily: number;
  category_drift: string;
  reversal_signal: boolean;
  projection_30d: number;
}

// ═══════════════════════════════════════════════════════════════════════
// IDENTITY — GET /identity
// ═══════════════════════════════════════════════════════════════════════

export interface IdentityResponse {
  primary_identity: string;
  secondary_identities: string[];
  identity_traits: string[];
  identity_confidence: number;
  identity_scores: Record<string, number>;
  impulsivity_index: number;
  self_control_score: number;
  identity_stability: string;
}

// ═══════════════════════════════════════════════════════════════════════
// THRESHOLDS — GET /thresholds
// ═══════════════════════════════════════════════════════════════════════

export interface ThresholdResponse {
  daily: number;
  weekly: number;
  monthly: number;
  per_category: Record<string, number>;
  breach_days: string[];
  buffer_multiplier: number;
  risk_adjustment: number;
}

// ═══════════════════════════════════════════════════════════════════════
// MEMORY — GET /memory/status
// ═══════════════════════════════════════════════════════════════════════

export interface MemoryStatusResponse {
  data_maturity: string;
  txn_count: number;
  window_start: string | null;
  version_hash: string;
  is_stale: boolean;
}

// ═══════════════════════════════════════════════════════════════════════
// WEEKLY REPORT — GET /report/weekly
// ═══════════════════════════════════════════════════════════════════════

export interface WeeklyReportResponse {
  status: string;
  report_type?: string;
  generated_at?: string;
  summary?: {
    total_spend: number;
    transaction_count: number;
    category_breakdown: Record<string, number>;
  };
  narrative?: string;
  reason?: string;
}
