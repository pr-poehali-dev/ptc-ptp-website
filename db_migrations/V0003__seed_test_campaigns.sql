-- Создание тестового рекламодателя с балансом (пароль: password123)
INSERT INTO users (email, password_hash, username, balance, ad_balance) 
VALUES ('advertiser@test.com', 'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', 'TestAdvertiser', 0, 500.00)
ON CONFLICT (email) DO UPDATE SET ad_balance = 500.00;

-- Создание 10 тестовых кампаний (используем последний ID пользователя с email advertiser@test.com)
INSERT INTO campaigns (advertiser_id, title, url, reward, duration, budget, required_views, moderation_status, is_active)
SELECT 
    (SELECT id FROM users WHERE email = 'advertiser@test.com'),
    title,
    url,
    0.00015,
    5,
    budget,
    required_views,
    'approved',
    true
FROM (VALUES
    ('Онлайн-курс по программированию Python', 'https://python.org', 15.00, 1000),
    ('Крипто-кошелек нового поколения', 'https://metamask.io', 7.50, 500),
    ('Маркетплейс цифровых товаров', 'https://gumroad.com', 15.00, 1000),
    ('Образовательная платформа Coursera', 'https://coursera.org', 22.50, 1500),
    ('Облачное хранилище Dropbox', 'https://dropbox.com', 10.50, 700),
    ('Графический редактор Canva', 'https://canva.com', 12.00, 800),
    ('Видеохостинг для творцов Vimeo', 'https://vimeo.com', 9.00, 600),
    ('Платформа для фрилансеров Upwork', 'https://upwork.com', 18.00, 1200),
    ('Сервис email-рассылок Mailchimp', 'https://mailchimp.com', 13.50, 900),
    ('Конструктор сайтов Wix', 'https://wix.com', 16.50, 1100)
) AS t(title, url, budget, required_views);