-- ===================================================================
-- VOILA HIGH-PERFORMANCE POSTGRESQL SCHEMA INITIALIZATION
-- Multi-Dataset Versioning, Sub-15ms Analytics, & RAG/Vector Integration
-- ===================================================================

-- 1. Create Users Table for Authentication
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Dataset Ingestion Catalog
CREATE TABLE IF NOT EXISTS dataset_runs (
    run_id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    total_records INT DEFAULT 0,
    source_name TEXT,
    status VARCHAR(50) DEFAULT 'ready',
    kpi_summary JSONB
);
CREATE INDEX IF NOT EXISTS idx_dataset_runs_user ON dataset_runs(user_id, uploaded_at DESC);

-- 3. Create Main Conversations / Analytics Table
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
    ingested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
);

-- Performance B-Tree Indexes for Sub-15ms Aggregations
CREATE INDEX IF NOT EXISTS idx_conv_run_tweet ON conversations(dataset_run_id, tweet_id);
CREATE INDEX IF NOT EXISTS idx_conv_user_run ON conversations(user_id, dataset_run_id);
CREATE INDEX IF NOT EXISTS idx_conv_sentiment ON conversations(sentiment);
CREATE INDEX IF NOT EXISTS idx_conv_inbound ON conversations(inbound);
CREATE INDEX IF NOT EXISTS idx_conv_priority ON conversations(priority);

-- 4. Create Pre-Aggregated Baseline KPI Signatures Table
CREATE TABLE IF NOT EXISTS dataset_kpis (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    time_period VARCHAR(50) DEFAULT 'weekly',
    total_records INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    kpi_payload JSONB NOT NULL,
    CONSTRAINT uq_dataset_kpis_run_user_period UNIQUE(run_id, user_id, time_period)
);
CREATE INDEX IF NOT EXISTS idx_dataset_kpis_run_user ON dataset_kpis(run_id, user_id);

CREATE TABLE IF NOT EXISTS kpis (
    id SERIAL PRIMARY KEY,
    run_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    time_period VARCHAR(50) DEFAULT 'weekly',
    total_records INT DEFAULT 0,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payload JSONB NOT NULL,
    CONSTRAINT uq_kpis_run_user_period UNIQUE(run_id, user_id, time_period)
);

-- 5. Create Real-Time Ingestion Pipeline Status Table
CREATE TABLE IF NOT EXISTS pipeline_status (
    run_id VARCHAR(255) PRIMARY KEY,
    step VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error TEXT,
    history JSONB
);

-- 6. Create Agentic AI Conversation History Table
CREATE TABLE IF NOT EXISTS agent_conversations (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(255),
    question TEXT NOT NULL,
    query_type VARCHAR(100) DEFAULT 'general',
    required_tools JSONB,
    answer TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'success'
);
CREATE INDEX IF NOT EXISTS idx_agent_conv_user ON agent_conversations(user_id, timestamp DESC);
