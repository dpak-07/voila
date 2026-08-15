export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'overall';

export interface KpiPillars {
  issue_reduction_over_time?: {
    reduction_rate_percentage?: number;
    recurring_tickets_count?: number;
    baseline_cases?: number;
    trend?: 'improving' | 'declining' | 'stable';
  };
  sentiment_impact?: {
    negative_share_percentage?: number;
    escalation_multiplier?: number;
    high_risk_volume?: number;
    delta_escalation_pct?: number;
  };
  fast_mean_response_time?: {
    value_minutes?: number;
    avg_resolution_proxy_minutes?: number;
    sla_compliance_rate?: number;
    speedup_pct?: number;
  };
  ai_proposed_solution_impact?: {
    resolution_speedup_percentage?: number;
    cost_savings_estimated?: number;
    automated_resolutions_pct?: number;
  };
}

export interface KpiMetrics {
  total_conversations?: number;
  resolution_rate?: number;
  escalation_rate?: number;
  reopen_rate?: number;
  avg_response_time_minutes?: number;
  negative_sentiment_percentage?: number;
  positive_sentiment_percentage?: number;
  neutral_sentiment_percentage?: number;
  first_contact_resolution_rate?: number;
  sla_breach_rate?: number;
  customer_satisfaction_score?: number;
  total_agents_active?: number;
}

export interface SentimentDistribution {
  positive?: { count: number; percentage: number };
  neutral?: { count: number; percentage: number };
  negative?: { count: number; percentage: number };
}

export interface TopicSummary {
  topic_id?: string | number;
  topic?: string;
  cluster_name?: string;
  keywords?: string[];
  volume?: number;
  case_count?: number;
  percentage?: number;
  negative_percentage?: number;
  escalation_rate?: number;
  avg_response_time?: number;
  priority?: 'High' | 'Medium' | 'Low' | 'Critical';
  sentiment?: 'positive' | 'neutral' | 'negative';
  sample_utterances?: string[];
  sentiment_breakdown?: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface EmergingIssue {
  topic: string;
  keywords?: string[];
  growth_rate_percentage: number;
  current_volume: number;
  previous_volume: number;
  negative_complaints: number;
  escalation_risk: 'High' | 'Medium' | 'Low' | 'Critical';
  action_urgency: string;
}

export interface RecurringIssue {
  topic: string;
  total_recurrences: number;
  reopen_probability: number;
  avg_resolution_bottleneck_min: number;
  status: 'Investigating' | 'Fix Pending' | 'Resolved' | 'Monitoring';
}

export interface NewIssue {
  topic: string;
  initial_volume: number;
  severity_level: 'Critical' | 'High' | 'Medium' | 'Low';
  first_detected: string;
  source_channel: string;
}

export interface PriorityQueueItem {
  rank: number;
  topic: string;
  case_volume: number;
  negative_complaints: number;
  sla_response_target: string;
  urgency_score: number;
  owner_team: string;
}

export interface RootCauseItem {
  id: string;
  topic: string;
  root_cause: string;
  affected_users_pct: number;
  suggested_remedy: string;
  estimated_impact: string;
  status: 'Open' | 'In Progress' | 'Mitigated';
}

export interface TrendDataPoint {
  date: string;
  total_volume: number;
  positive_volume: number;
  negative_volume: number;
  neutral_volume: number;
  avg_response_time: number;
  is_spike?: boolean;
  z_score?: number;
  spike_reason?: string;
}

export interface DatasetRun {
  run_id: string;
  dataset_name?: string;
  filename?: string;
  created_at?: string;
  timestamp?: string;
  total_rows?: number;
  rows_count?: number;
  user_id?: string;
  status?: string;
}

export interface PipelineLog {
  run_id: string;
  step: string;
  status: 'SUCCESS' | 'RUNNING' | 'FAILED' | 'PENDING';
  timestamp: string;
  error?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  tools_used?: string[];
  context?: any;
  validation_issues?: string[];
  is_typing?: boolean;
}

export interface FilterState {
  timePeriod: TimePeriod;
  runId: string | null;
  company: string | null;
  product: string | null;
  region: string | null;
  searchQuery: string;
}

export interface AnalysisHubResponse {
  status: string;
  kpis: KpiMetrics;
  kpi_pillars: KpiPillars;
  sentiment_distribution: SentimentDistribution;
  topic_summaries: TopicSummary[];
  customer_pain_points: TopicSummary[];
  new_issues: NewIssue[];
  recurring_issues: RecurringIssue[];
  emerging_issues: EmergingIssue[];
  priorities: PriorityQueueItem[];
  recommendations: RootCauseItem[];
  root_cause_analysis: RootCauseItem[];
  spike_alerts?: Array<{
    id?: string;
    topic: string;
    cluster_name?: string;
    volume?: number;
    baseline?: number;
    z_score?: number;
    surge_percentage?: number;
    severity?: string;
    status?: string;
  }>;
  trends: {
    daily?: TrendDataPoint[];
    weekly?: TrendDataPoint[];
    monthly?: TrendDataPoint[];
    data?: TrendDataPoint[];
    spikes?: Array<{ date?: string; z_score?: number; topic?: string }>;
  };
  llm_summary?: string;
  filters?: any;
}
