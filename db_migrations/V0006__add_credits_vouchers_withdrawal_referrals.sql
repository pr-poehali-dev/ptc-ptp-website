-- Меняем баланс пользователей на кредиты
ALTER TABLE users 
  ADD COLUMN credits DECIMAL(15, 2) DEFAULT 0.00,
  ADD COLUMN referral_code VARCHAR(20) UNIQUE,
  ADD COLUMN referred_by INTEGER REFERENCES users(id),
  ADD COLUMN total_referral_earnings DECIMAL(15, 2) DEFAULT 0.00;

-- Переносим баланс из долларов в кредиты (конвертация по старому курсу)
UPDATE users SET credits = balance * 100 WHERE balance IS NOT NULL;

-- Таблица ваучеров
CREATE TABLE vouchers (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  credits DECIMAL(15, 2) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_by INTEGER REFERENCES users(id),
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_voucher_code ON vouchers(code);
CREATE INDEX idx_voucher_used ON vouchers(is_used);

-- Таблица методов вывода
CREATE TABLE withdrawal_methods (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Добавляем дефолтные методы вывода
INSERT INTO withdrawal_methods (name) VALUES 
  ('Криптовалюта (USDT TRC-20)'),
  ('Криптовалюта (BTC)'),
  ('PayPal'),
  ('Банковская карта');

-- Таблица заявок на вывод
CREATE TABLE withdrawal_requests (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  credits DECIMAL(15, 2) NOT NULL,
  usd_amount DECIMAL(15, 2) NOT NULL,
  method_id INTEGER NOT NULL REFERENCES withdrawal_methods(id),
  wallet_address TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
);

CREATE INDEX idx_withdrawal_user ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_status ON withdrawal_requests(status);

-- Таблица настроек (курс конвертации)
CREATE TABLE settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Устанавливаем курс: 100 кредитов = 1 доллар
INSERT INTO settings (key, value) VALUES ('credits_to_usd_rate', '100');

-- Обновляем таблицу кампаний: цена в кредитах
ALTER TABLE campaigns 
  ADD COLUMN cost_per_view DECIMAL(10, 2) DEFAULT 1.00;

UPDATE campaigns SET cost_per_view = 1.00;

-- Таблица истории реферальных начислений
CREATE TABLE referral_earnings (
  id SERIAL PRIMARY KEY,
  referrer_id INTEGER NOT NULL REFERENCES users(id),
  referred_user_id INTEGER NOT NULL REFERENCES users(id),
  ad_view_id INTEGER REFERENCES ad_views(id),
  credits DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_referral_referrer ON referral_earnings(referrer_id);

-- Генерируем реферальные коды для существующих пользователей
UPDATE users 
SET referral_code = SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 10)
WHERE referral_code IS NULL;