-- ===================================================================
-- VOILA JSONB -> RELATIONAL TABLES MIGRATION (idempotent)
-- Unpacks legacy JSONB blobs into normalized tables, then drops the JSON columns.
-- Safe to run multiple times.
-- ===================================================================

-- 1. Add scalar metric columns to dataset_kpis
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS total_conversations INT DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS total_inbound INT DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS total_outbound INT DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS resolution_rate NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS escalation_rate NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS reopen_rate NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS avg_response_time_minutes NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS avg_resolution_proxy_minutes NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS negative_sentiment_percentage NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS positive_sentiment_percentage NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS emerging_spikes_count INT DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS recurring_issue_count INT DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS recurring_issues_reduction NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS sentiment_escalation_multiplier NUMERIC DEFAULT 1.0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS fast_mean_response_time NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS ai_speedup_boost NUMERIC DEFAULT 0;
ALTER TABLE dataset_kpis ADD COLUMN IF NOT EXISTS llm_summary TEXT;

-- 2. Backfill scalar columns from legacy kpi_payload JSONB
UPDATE dataset_kpis SET
    total_conversations = COALESCE((kpi_payload->'kpi_metrics'->>'total_conversations')::int, total_records),
    total_inbound = COALESCE((kpi_payload->'kpi_metrics'->>'total_inbound')::int, 0),
    total_outbound = COALESCE((kpi_payload->'kpi_metrics'->>'total_outbound')::int, 0),
    resolution_rate = COALESCE((kpi_payload->'kpi_metrics'->>'resolution_rate')::numeric, 0),
    escalation_rate = COALESCE((kpi_payload->'kpi_metrics'->>'escalation_rate')::numeric, 0),
    reopen_rate = COALESCE((kpi_payload->'kpi_metrics'->>'reopen_rate')::numeric, 0),
    avg_response_time_minutes = COALESCE((kpi_payload->'kpi_metrics'->>'avg_response_time_minutes')::numeric, 0),
    avg_resolution_proxy_minutes = COALESCE((kpi_payload->'kpi_metrics'->>'avg_resolution_proxy_minutes')::numeric, 0),
    negative_sentiment_percentage = COALESCE((kpi_payload->'kpi_metrics'->>'negative_sentiment_percentage')::numeric, 0),
    positive_sentiment_percentage = COALESCE((kpi_payload->'kpi_metrics'->>'positive_sentiment_percentage')::numeric, 0),
    emerging_spikes_count = COALESCE((kpi_payload->'kpi_pillars'->>'emerging_spikes_count')::int, 0),
    recurring_issue_count = COALESCE((kpi_payload->'kpi_pillars'->>'recurring_issue_count')::int, 0),
    recurring_issues_reduction = COALESCE((kpi_payload->'kpi_pillars'->>'recurring_issues_reduction')::numeric, 0),
    sentiment_escalation_multiplier = COALESCE((kpi_payload->'kpi_pillars'->>'sentiment_escalation_multiplier')::numeric, 1.0),
    fast_mean_response_time = COALESCE((kpi_payload->'kpi_pillars'->>'fast_mean_response_time')::numeric, 0),
    ai_speedup_boost = COALESCE((kpi_payload->'kpi_pillars'->>'ai_speedup_boost')::numeric, 0),
    llm_summary = kpi_payload->>'llm_summary'
WHERE kpi_payload IS NOT NULL;

-- 3. Child tables (created by init_schema.sql if absent, guaranteed here)
CREATE TABLE IF NOT EXISTS kpi_sentiment (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    count INT DEFAULT 0,
    percentage NUMERIC DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpi_topics (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    topic_keywords TEXT NOT NULL,
    cluster_name TEXT,
    volume INT DEFAULT 0,
    negative_complaints INT DEFAULT 0,
    escalation_cases INT DEFAULT 0,
    avg_response_time NUMERIC DEFAULT 0,
    pain_score NUMERIC DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpi_topic_samples (
    id SERIAL PRIMARY KEY,
    topic_id INT NOT NULL REFERENCES kpi_topics(id) ON DELETE CASCADE,
    run_id VARCHAR(255) NOT NULL,
    text TEXT,
    sentiment VARCHAR(50),
    confidence NUMERIC DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpi_issues (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    issue_type VARCHAR(20) NOT NULL,
    topic_keywords TEXT NOT NULL,
    cluster_name TEXT,
    volume INT DEFAULT 0,
    negative_complaints INT DEFAULT 0,
    pain_score NUMERIC DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpi_priorities (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    cluster_name TEXT,
    issue TEXT,
    volume INT DEFAULT 0,
    negative_complaints INT DEFAULT 0
);
CREATE TABLE IF NOT EXISTS kpi_trends (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    trend_type VARCHAR(20) NOT NULL,
    day DATE,
    positive INT DEFAULT 0,
    neutral INT DEFAULT 0,
    negative INT DEFAULT 0,
    total INT DEFAULT 0,
    escalation NUMERIC DEFAULT 0,
    resolution NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kpi_sentiment_run ON kpi_sentiment(run_id);
CREATE INDEX IF NOT EXISTS idx_kpi_topics_run ON kpi_topics(run_id);
CREATE INDEX IF NOT EXISTS idx_kpi_samples_run ON kpi_topic_samples(run_id);
CREATE INDEX IF NOT EXISTS idx_kpi_issues_run ON kpi_issues(run_id);
CREATE INDEX IF NOT EXISTS idx_kpi_priorities_run ON kpi_priorities(run_id);
CREATE INDEX IF NOT EXISTS idx_kpi_trends_run ON kpi_trends(run_id);

-- 4. Populate child tables only for runs not yet migrated (avoid duplicates on rerun)
INSERT INTO kpi_topics (run_id, topic_keywords, cluster_name, volume, negative_complaints, escalation_cases, avg_response_time, pain_score)
SELECT dk.run_id,
       COALESCE(t->>'topic_keywords', 'General'),
       t->>'cluster_name',
       COALESCE((t->>'volume')::int, 0),
       COALESCE((t->>'negative_complaints')::int, 0),
       COALESCE((t->>'escalation_cases')::int, 0),
       COALESCE((t->>'avg_response_time')::numeric, 0),
       COALESCE((t->>'pain_score')::numeric, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'topic_summaries', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_topics kt WHERE kt.run_id = dk.run_id AND kt.topic_keywords = COALESCE(t->>'topic_keywords', 'General'));

INSERT INTO kpi_topic_samples (topic_id, run_id, text, sentiment, confidence)
SELECT kt.id, kt.run_id, s->>'text', s->>'sentiment', COALESCE((s->>'confidence')::numeric, 0)
FROM kpi_topics kt
JOIN dataset_kpis dk ON dk.run_id = kt.run_id
CROSS JOIN LATERAL jsonb_array_elements(
    COALESCE((SELECT t2->'sample_texts' FROM jsonb_array_elements(dk.kpi_payload->'topic_summaries') t2 WHERE t2->>'topic_keywords' = kt.topic_keywords LIMIT 1), '[]'::jsonb)
) s
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_topic_samples ks WHERE ks.run_id = kt.run_id AND ks.text = s->>'text');

INSERT INTO kpi_sentiment (run_id, sentiment, count, percentage)
SELECT dk.run_id, 'positive', COALESCE((dk.kpi_payload->'sentiment_distribution'->'positive'->>'count')::int, 0), COALESCE((dk.kpi_payload->'sentiment_distribution'->'positive'->>'percentage')::numeric, 0)
FROM dataset_kpis dk WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_sentiment ks WHERE ks.run_id = dk.run_id AND ks.sentiment = 'positive')
UNION ALL
SELECT dk.run_id, 'neutral', COALESCE((dk.kpi_payload->'sentiment_distribution'->'neutral'->>'count')::int, 0), COALESCE((dk.kpi_payload->'sentiment_distribution'->'neutral'->>'percentage')::numeric, 0)
FROM dataset_kpis dk WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_sentiment ks WHERE ks.run_id = dk.run_id AND ks.sentiment = 'neutral')
UNION ALL
SELECT dk.run_id, 'negative', COALESCE((dk.kpi_payload->'sentiment_distribution'->'negative'->>'count')::int, 0), COALESCE((dk.kpi_payload->'sentiment_distribution'->'negative'->>'percentage')::numeric, 0)
FROM dataset_kpis dk WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_sentiment ks WHERE ks.run_id = dk.run_id AND ks.sentiment = 'negative');

INSERT INTO kpi_issues (run_id, issue_type, topic_keywords, cluster_name, volume, negative_complaints, pain_score)
SELECT dk.run_id, 'emerging', COALESCE(t->>'topic_keywords', 'General'), t->>'cluster_name', COALESCE((t->>'volume')::int, 0), COALESCE((t->>'negative_complaints')::int, 0), COALESCE((t->>'pain_score')::numeric, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'emerging_issues', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_issues ki WHERE ki.run_id = dk.run_id AND ki.issue_type = 'emerging' AND ki.topic_keywords = COALESCE(t->>'topic_keywords', 'General'))
UNION ALL
SELECT dk.run_id, 'recurring', COALESCE(t->>'topic_keywords', 'General'), t->>'cluster_name', COALESCE((t->>'volume')::int, 0), COALESCE((t->>'negative_complaints')::int, 0), COALESCE((t->>'pain_score')::numeric, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'recurring_issues', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_issues ki WHERE ki.run_id = dk.run_id AND ki.issue_type = 'recurring' AND ki.topic_keywords = COALESCE(t->>'topic_keywords', 'General'))
UNION ALL
SELECT dk.run_id, 'new', COALESCE(t->>'topic_keywords', 'General'), t->>'cluster_name', COALESCE((t->>'volume')::int, 0), COALESCE((t->>'negative_complaints')::int, 0), COALESCE((t->>'pain_score')::numeric, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'new_issues', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_issues ki WHERE ki.run_id = dk.run_id AND ki.issue_type = 'new' AND ki.topic_keywords = COALESCE(t->>'topic_keywords', 'General'));

INSERT INTO kpi_priorities (run_id, priority, cluster_name, issue, volume, negative_complaints)
SELECT dk.run_id, COALESCE(t->>'priority', 'normal'), t->>'cluster_name', t->>'issue', COALESCE((t->>'volume')::int, 0), COALESCE((t->>'negative_complaints')::int, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'priorities', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_priorities kp WHERE kp.run_id = dk.run_id AND kp.priority = COALESCE(t->>'priority', 'normal') AND kp.issue = t->>'issue');

INSERT INTO kpi_trends (run_id, trend_type, day, positive, neutral, negative, total, escalation, resolution)
SELECT dk.run_id, 'sentiment', (t->>'day')::date, COALESCE((t->>'positive')::int, 0), COALESCE((t->>'neutral')::int, 0), COALESCE((t->>'negative')::int, 0), COALESCE((t->>'total')::int, 0), 0, 0
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'trends'->'sentiment_trend', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_trends kt WHERE kt.run_id = dk.run_id AND kt.trend_type = 'sentiment' AND kt.day = (t->>'day')::date)
UNION ALL
SELECT dk.run_id, 'service', (t->>'day')::date, 0, 0, 0, COALESCE((t->>'total')::int, 0), COALESCE((t->>'escalation')::numeric, 0), COALESCE((t->>'resolution')::numeric, 0)
FROM dataset_kpis dk
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(dk.kpi_payload->'trends'->'service_trend', '[]'::jsonb)) t
WHERE dk.kpi_payload IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM kpi_trends kt WHERE kt.run_id = dk.run_id AND kt.trend_type = 'service' AND kt.day = (t->>'day')::date);

-- 5. Migrate agent required_tools JSONB -> agent_tools
CREATE TABLE IF NOT EXISTS agent_tools (
    id SERIAL PRIMARY KEY,
    agent_conversation_id INT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL
);
INSERT INTO agent_tools (agent_conversation_id, tool_name)
SELECT ac.id, tool
FROM agent_conversations ac
CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(ac.required_tools, '[]'::jsonb)) tool
WHERE ac.required_tools IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM agent_tools at WHERE at.agent_conversation_id = ac.id AND at.tool_name = tool);

-- 6. Migrate pipeline history JSONB -> pipeline_history
CREATE TABLE IF NOT EXISTS pipeline_history (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error TEXT
);
INSERT INTO pipeline_history (run_id, step, status, timestamp, error)
SELECT ps.run_id, h->>'step', h->>'status', COALESCE((h->>'timestamp')::timestamptz, CURRENT_TIMESTAMP), h->>'error'
FROM pipeline_status ps
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(ps.history, '[]'::jsonb)) h
WHERE ps.history IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM pipeline_history ph WHERE ph.run_id = ps.run_id AND ph.step = h->>'step' AND ph.timestamp = COALESCE((h->>'timestamp')::timestamptz, CURRENT_TIMESTAMP));

-- 7. Drop legacy JSONB columns / tables (only after successful backfill)
ALTER TABLE dataset_kpis DROP COLUMN IF EXISTS kpi_payload;
ALTER TABLE dataset_runs DROP COLUMN IF EXISTS kpi_summary;
ALTER TABLE agent_conversations DROP COLUMN IF EXISTS required_tools;
ALTER TABLE pipeline_status DROP COLUMN IF EXISTS history;
DROP TABLE IF EXISTS kpis;
