-- Добавление дополнительных тестовых магазинов

DO $$
DECLARE
    user1_id UUID;
    user2_id UUID;
    user3_id UUID;
    seller1_id UUID;
    seller2_id UUID;
    seller3_id UUID;
BEGIN
    -- Создаем тестового пользователя 1 (Магазин электроники)
    INSERT INTO users (telegram_id, username, first_name, last_name, role)
    VALUES (111111111, 'tech_store', 'Максим', 'Технов', 'seller')
    ON CONFLICT (telegram_id) DO NOTHING;
    
    SELECT id INTO user1_id FROM users WHERE telegram_id = 111111111;
    
    -- Создаем магазин 1
    INSERT INTO sellers (user_id, shop_name, description, status, seller_level, rating, total_sales)
    VALUES (
        user1_id,
        'ТехноМир',
        'Лучшая электроника и гаджеты. Быстрая доставка, гарантия качества!',
        'approved',
        'gold',
        4.8,
        156
    )
    ON CONFLICT (user_id) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        description = EXCLUDED.description,
        status = 'approved'
    RETURNING id INTO seller1_id;
    
    IF seller1_id IS NULL THEN
        SELECT id INTO seller1_id FROM sellers WHERE user_id = user1_id;
    END IF;
    
    -- Добавляем товары для магазина 1
    INSERT INTO products (seller_id, name, description, price, currency, discount, tags, status, is_digital)
    VALUES
        (
            seller1_id,
            'Беспроводные наушники TWS',
            'Качественные беспроводные наушники с шумоподавлением. Время работы до 30 часов.',
            2999.00,
            'RUB',
            15,
            '["электроника", "наушники", "гаджеты"]'::jsonb,
            'approved',
            false
        ),
        (
            seller1_id,
            'Умная колонка',
            'Умная колонка с голосовым помощником. Управление умным домом.',
            4499.00,
            'RUB',
            10,
            '["электроника", "умный дом"]'::jsonb,
            'approved',
            false
        ),
        (
            seller1_id,
            'Power Bank 20000 mAh',
            'Мощный повербанк с быстрой зарядкой. Заряжает до 5 устройств одновременно.',
            1799.00,
            'RUB',
            5,
            '["аксессуары", "зарядка"]'::jsonb,
            'approved',
            false
        );
    
    -- Создаем тестового пользователя 2 (Магазин одежды)
    INSERT INTO users (telegram_id, username, first_name, last_name, role)
    VALUES (222222222, 'fashion_store', 'Анна', 'Стильная', 'seller')
    ON CONFLICT (telegram_id) DO NOTHING;
    
    SELECT id INTO user2_id FROM users WHERE telegram_id = 222222222;
    
    -- Создаем магазин 2
    INSERT INTO sellers (user_id, shop_name, description, status, seller_level, rating, total_sales)
    VALUES (
        user2_id,
        'FashionStyle',
        'Модная одежда и аксессуары. Только оригинальные бренды!',
        'approved',
        'silver',
        4.5,
        89
    )
    ON CONFLICT (user_id) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        description = EXCLUDED.description,
        status = 'approved'
    RETURNING id INTO seller2_id;
    
    IF seller2_id IS NULL THEN
        SELECT id INTO seller2_id FROM sellers WHERE user_id = user2_id;
    END IF;
    
    -- Добавляем товары для магазина 2
    INSERT INTO products (seller_id, name, description, price, currency, discount, tags, status, is_digital)
    VALUES
        (
            seller2_id,
            'Джинсы классические',
            'Стильные джинсы премиум качества. Размеры 28-38. Свободная посадка.',
            5999.00,
            'RUB',
            20,
            '["одежда", "джинсы"]'::jsonb,
            'approved',
            false
        ),
        (
            seller2_id,
            'Кожаная куртка',
            'Элегантная кожаная куртка из натуральной кожи. Классический стиль.',
            15999.00,
            'RUB',
            25,
            '["одежда", "куртки", "кожа"]'::jsonb,
            'approved',
            false
        ),
        (
            seller2_id,
            'Шарф кашемировый',
            'Мягкий шарф из кашемира. Идеально для холодной погоды.',
            2999.00,
            'RUB',
            0,
            '["аксессуары", "зима"]'::jsonb,
            'approved',
            false
        );
    
    -- Создаем тестового пользователя 3 (Магазин книг и курсов)
    INSERT INTO users (telegram_id, username, first_name, last_name, role)
    VALUES (333333333, 'edu_master', 'Дмитрий', 'Учёный', 'seller')
    ON CONFLICT (telegram_id) DO NOTHING;
    
    SELECT id INTO user3_id FROM users WHERE telegram_id = 333333333;
    
    -- Создаем магазин 3
    INSERT INTO sellers (user_id, shop_name, description, status, seller_level, rating, total_sales)
    VALUES (
        user3_id,
        'Образовательный центр',
        'Онлайн-курсы и электронные книги. Развивайтесь вместе с нами!',
        'approved',
        'silver',
        4.9,
        234
    )
    ON CONFLICT (user_id) DO UPDATE
    SET shop_name = EXCLUDED.shop_name,
        description = EXCLUDED.description,
        status = 'approved'
    RETURNING id INTO seller3_id;
    
    IF seller3_id IS NULL THEN
        SELECT id INTO seller3_id FROM sellers WHERE user_id = user3_id;
    END IF;
    
    -- Добавляем товары для магазина 3
    INSERT INTO products (seller_id, name, description, price, currency, discount, tags, status, is_digital)
    VALUES
        (
            seller3_id,
            'Курс по Python программированию',
            'Полный курс от начального до продвинутого уровня. 100+ уроков и практика.',
            7999.00,
            'RUB',
            30,
            '["обучение", "программирование", "python"]'::jsonb,
            'approved',
            true
        ),
        (
            seller3_id,
            'Книга "Искусство презентаций"',
            'Электронная книга о создании убедительных презентаций. PDF формат.',
            599.00,
            'RUB',
            0,
            '["книги", "бизнес", "обучение"]'::jsonb,
            'approved',
            true
        ),
        (
            seller3_id,
            'Мастер-класс по дизайну',
            'Запись мастер-класса по UI/UX дизайну от эксперта. 5 часов видео.',
            2999.00,
            'RUB',
            15,
            '["обучение", "дизайн", "видео"]'::jsonb,
            'approved',
            true
        );
    
    RAISE NOTICE 'Добавлено 3 новых магазина с товарами!';
END $$;

