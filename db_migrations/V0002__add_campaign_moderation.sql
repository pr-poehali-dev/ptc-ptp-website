-- Добавление поля модерации в campaigns
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS required_views INTEGER DEFAULT 0;
ALTER TABLE campaigns ALTER COLUMN duration SET DEFAULT 5;

-- Добавление уникального индекса для отслеживания просмотров с одного IP
CREATE TABLE IF NOT EXISTS user_ips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, ip_address)
);

-- Добавление индекса
CREATE INDEX IF NOT EXISTS idx_user_ips_user ON user_ips(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_moderation ON campaigns(moderation_status);