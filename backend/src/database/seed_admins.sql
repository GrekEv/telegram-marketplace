-- Добавление администраторов

DO $$
DECLARE
    admin_user_id UUID;
    superadmin_user_id UUID;
BEGIN
    -- Создаем или обновляем админа
    INSERT INTO users (telegram_id, username, first_name, last_name, role)
    VALUES (100000001, 'iskovs', 'Admin', 'User', 'admin')
    ON CONFLICT (telegram_id) DO UPDATE
    SET role = 'admin',
        username = 'iskovs',
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO admin_user_id;
    
    IF admin_user_id IS NULL THEN
        SELECT id INTO admin_user_id FROM users WHERE telegram_id = 100000001;
    END IF;
    
    -- Создаем или обновляем суперадмина
    INSERT INTO users (telegram_id, username, first_name, last_name, role)
    VALUES (100000002, 'kirilldeniushkin', 'Kirill', 'Deniushkin', 'superadmin')
    ON CONFLICT (telegram_id) DO UPDATE
    SET role = 'superadmin',
        username = 'kirilldeniushkin',
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO superadmin_user_id;
    
    IF superadmin_user_id IS NULL THEN
        SELECT id INTO superadmin_user_id FROM users WHERE telegram_id = 100000002;
    END IF;
    
    RAISE NOTICE 'Администраторы успешно созданы/обновлены!';
    RAISE NOTICE 'Admin: @iskovs (ID: %)', admin_user_id;
    RAISE NOTICE 'Superadmin: @kirilldeniushkin (ID: %)', superadmin_user_id;
END $$;

