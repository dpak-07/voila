-- ===================================================================
-- VOILA POSTGRESQL SCHEMA INITIALIZATION
-- Fully normalized relational schema (no JSONB blobs).
-- Multi-Dataset Versioning, Sub-15ms Analytics, & RAG Integration.
-- ===================================================================

-- 1. Users Table for Authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dataset Ingestion Catalog
CREATE TABLE IF NOT EXISTS dataset_runs (
    run_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_records INT DEFAULT 0,
    source_name TEXT,
    status VARCHAR(50) DEFAULT 'ready'
);
CREATE INDEX IF NOT EXISTS idx_dataset_runs_user ON dataset_runs(user_id, uploaded_at DESC);

-- 3. Main Conversations / Analytics Table
CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL,
    tweet_id BIGINT NOT NULL,
    dataset_run_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL DEFAULT 'deepak',
    author_id VARCHAR(255),
    inbound BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE,
    date DATE,
    text TEXT,
    clean_text TEXT,
    sentiment VARCHAR(50),
    sentiment_score NUMERIC DEFAULT 0,
    confidence NUMERIC DEFAULT 0.0,
    priority VARCHAR(50) DEFAULT 'normal',
    conversation_id VARCHAR(255),
    topic_id INT DEFAULT 0,
    topic_keywords TEXT,
    spike_detected BOOLEAN DEFAULT FALSE,
    response_time_minutes NUMERIC DEFAULT 0.0,
    brand TEXT,
    company TEXT,
    product TEXT,
    region TEXT,
    intent TEXT,
    pain_point TEXT,
    issue_type TEXT,
    resolution_status TEXT,
    fcr BOOLEAN DEFAULT FALSE,
    escalated BOOLEAN DEFAULT FALSE,
    reopened BOOLEAN DEFAULT FALSE,
    resolution_flag BOOLEAN DEFAULT FALSE,
    escalation_flag BOOLEAN DEFAULT FALSE,
    first_response_time_minutes NUMERIC DEFAULT 0,
    average_response_time_minutes NUMERIC DEFAULT 0,
    resolution_time_minutes NUMERIC DEFAULT 0,
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Performance B-Tree Indexes for Sub-15ms Aggregations
CREATE INDEX IF NOT EXISTS idx_conv_run_tweet ON conversations(dataset_run_id, tweet_id);
CREATE INDEX IF NOT EXISTS idx_conv_user_run ON conversations(user_id, dataset_run_id);
CREATE INDEX IF NOT EXISTS idx_conv_sentiment ON conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_conv_inbound ON conversations(inbound);
CREATE INDEX IF NOT EXISTS idx_conv_priority ON conversations(priority);

-- 4. Normalized KPI Signature (per run) -- scalar metrics only, no JSONB
CREATE TABLE IF NOT EXISTS dataset_kpis (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    time_period VARCHAR(50) DEFAULT 'weekly',
    total_records INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_conversations INT DEFAULT 0,
    total_inbound INT DEFAULT 0,
    total_outbound INT DEFAULT 0,
    resolution_rate NUMERIC DEFAULT 0,
    escalation_rate NUMERIC DEFAULT 0,
    reopen_rate NUMERIC DEFAULT 0,
    avg_response_time_minutes NUMERIC DEFAULT 0,
    avg_resolution_proxy_minutes NUMERIC DEFAULT 0,
    negative_sentiment_percentage NUMERIC DEFAULT 0,
    positive_sentiment_percentage NUMERIC DEFAULT 0,
    emerging_spikes_count INT DEFAULT 0,
    recurring_issue_count INT DEFAULT 0,
    recurring_issues_reduction NUMERIC DEFAULT 0,
    sentiment_escalation_multiplier NUMERIC DEFAULT 1.0,
    fast_mean_response_time NUMERIC DEFAULT 0,
    ai_speedup_boost NUMERIC DEFAULT 0,
    llm_summary TEXT,
    CONSTRAINT uq_dataset_kpis_run_user_period UNIQUE(run_id, user_id, time_period)
);
CREATE INDEX IF NOT EXISTS idx_dataset_kpis_run_user ON dataset_kpis(run_id, user_id);

-- 4a. Sentiment distribution per run
CREATE TABLE IF NOT EXISTS kpi_sentiment (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    sentiment VARCHAR(50) NOT NULL,
    count INT DEFAULT 0,
    percentage NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kpi_sentiment_run ON kpi_sentiment(run_id);

-- 4b. Topic summaries per run
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
CREATE INDEX IF NOT EXISTS idx_kpi_topics_run ON kpi_topics(run_id);

-- 4c. Sample conversations per topic
CREATE TABLE IF NOT EXISTS kpi_topic_samples (
    id SERIAL PRIMARY KEY,
    topic_id INT NOT NULL REFERENCES kpi_topics(id) ON DELETE CASCADE,
    run_id VARCHAR(255) NOT NULL,
    text TEXT,
    sentiment VARCHAR(50),
    confidence NUMERIC DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kpi_samples_run ON kpi_topic_samples(run_id);

-- 4d. Issues per run (emerging / recurring / new)
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
CREATE INDEX IF NOT EXISTS idx_kpi_issues_run ON kpi_issues(run_id);

-- 4e. Priority issues per run
CREATE TABLE IF NOT EXISTS kpi_priorities (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    priority VARCHAR(20) NOT NULL,
    cluster_name TEXT,
    issue TEXT,
    volume INT DEFAULT 0,
    negative_complaints INT DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_kpi_priorities_run ON kpi_priorities(run_id);

-- 4f. Trends per run (sentiment + service series)
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
CREATE INDEX IF NOT EXISTS idx_kpi_trends_run ON kpi_trends(run_id);

-- 5. Real-Time Ingestion Pipeline Status Table
CREATE TABLE IF NOT EXISTS pipeline_status (
    run_id VARCHAR(255) PRIMARY KEY,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error TEXT
);

-- 5a. Pipeline step history (replaces history JSONB)
CREATE TABLE IF NOT EXISTS pipeline_history (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error TEXT
);
CREATE INDEX IF NOT EXISTS idx_pipeline_history_run ON pipeline_history(run_id, timestamp DESC);

-- 6. Agentic AI Conversation History Table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    question TEXT NOT NULL,
    query_type VARCHAR(100) DEFAULT 'general',
    answer TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'success'
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id, timestamp DESC);

-- 6a. Tools used per agent conversation (replaces required_tools JSONB)
CREATE TABLE IF NOT EXISTS agent_tools (
    id SERIAL PRIMARY KEY,
    agent_conversation_id INT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
    tool_name VARCHAR(255) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_agent_tools_conv ON agent_tools(agent_conversation_id);
