-- Fix test user password hash (password: test123)
UPDATE users SET password_hash = 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae' WHERE email = 'user@test.com';