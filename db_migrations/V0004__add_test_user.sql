-- Создание тестового пользователя с балансом для просмотра (пароль: test123)
INSERT INTO users (email, password_hash, username, balance, ad_balance, total_clicks) 
VALUES ('user@test.com', '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', 'TestUser', 10.00, 0.00, 0)
ON CONFLICT (email) DO UPDATE SET balance = 10.00, total_clicks = 0;