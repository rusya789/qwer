const express = require('express')
const { Pool } = require('pg')
const cors = require('cors')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('nodemailer')

const app = express()
app.use(cors())
app.use(express.json())

// Настройка подключения к PostgreSQL
const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'tireservice',
    password: 'root',
    port: 5432,
})

// Создаем тестовый транспорт
const transporter = nodemailer.createTransport({
    host: 'smtp.yandex.ru',
    port: 465,
    secure: true, // обязательно true для 465 порта
    auth: {
        user: 'vika-kirillova-2014@yandex.ru', // ваш ящик на Яндексе
        pass: 'vyryfvdzvtndqnmt'    // пароль приложения, НЕ обычный пароль!
    }
});

// Функция отправки уведомления
const sendAppointmentEmail = async (email, appointmentData, serviceName) => {
    const mailOptions = {
        from: 'vika-kirillova-2014@yandex.ru',
        to: email,
        subject: 'Напоминание о записи в QuickTire Pro',
        text: `
Уважаемый(ая) клиент!

Напоминаем, что у вас запланирована запись в шиномонтаж QuickTire Pro.

Дата и время: ${new Date(appointmentData.start_time).toLocaleString('ru-RU')}
Услуга: ${serviceName}

Адрес: г. Саратов, ул. Октябрьская, 60

Если у вас возникли вопросы, свяжитесь с нами:
Телефон: +7 (970) 066-38-33
Email: info@quicktirepro.ru

С уважением,
Команда QuickTire Pro
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Уведомление отправлено успешно');
    } catch (error) {
        console.error('Ошибка при отправке уведомления:', error);
        throw error;
    }
};

// Middleware для проверки аутентификации
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) return res.status(401).json({ error: 'Unauthorized' })

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret_key')
        req.user = decoded
        next()
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' })
    }
}

// Middleware для проверки прав администратора
const checkAdmin = (req, res, next) => {
    if (req.user.typeid !== 3) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    next()
}

// Middleware для проверки прав лидера
const checkLeader = (req, res, next) => {
    if (req.user.typeid !== 2) {
        return res.status(403).json({ error: 'Forbidden' })
    }
    next()
}

// Регистрация пользователя
app.post('/api/auth/register', async (req, res) => {
    const { login, password, phone, fullName, age } = req.body

    try {
        const hashedPassword = await bcrypt.hash(password, 10)

        const { rows } = await pool.query(
            `INSERT INTO users 
            (login, password, typeid, phone, full_name, age) 
            VALUES ($1, $2, 1, $3, $4, $5) 
            RETURNING id, login, phone, full_name, age, typeid`,
            [login, hashedPassword, phone, fullName, age]
        )

        const token = jwt.sign(
            { userId: rows[0].id, typeid: rows[0].typeid },
            'your_jwt_secret_key',
            { expiresIn: '1h' }
        )

        res.status(201).json({
            token,
            user: {
                id: rows[0].id,
                login: rows[0].login,
                typeid: rows[0].typeid,
                full_name: rows[0].full_name,
                phone: rows[0].phone,
                age: rows[0].age,
            },
        })
    } catch (err) {
        console.error(err)
        if (err.code === '23505' && err.constraint === 'users_login_key') {
            return res.status(400).json({ error: 'Пользователь с таким логином уже существует' })
        }
        res.status(500).json({ error: 'Ошибка регистрации' })
    }
})

// Вход пользователя
app.post('/api/auth/login', async (req, res) => {
    const { login, password } = req.body

    try {
        const { rows } = await pool.query(
            `SELECT u.id, u.login, u.password, u.typeid, u.phone, u.full_name, u.age, t.typename 
             FROM users u
             JOIN typeusers t ON u.typeid = t.id
             WHERE u.login = $1`,
            [login]
        )

        if (rows.length === 0) {
            return res.status(401).json({ error: 'Неверный логин или пароль' })
        }

        const user = rows[0]
        const validPassword = await bcrypt.compare(password, user.password)

        if (!validPassword) {
            return res.status(401).json({ error: 'Неверный логин или пароль' })
        }

        const token = jwt.sign(
            {
                userId: user.id,
                typeid: user.typeid,
                typename: user.typename,
            },
            'your_jwt_secret_key',
            { expiresIn: '1h' }
        )

        res.json({
            token,
            user: {
                id: user.id,
                login: user.login,
                typeid: user.typeid,
                typename: user.typename,
                phone: user.phone,
                full_name: user.full_name,
                age: user.age,
            },
        })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Ошибка входа' })
    }
})

// Получение списка услуг
app.get('/api/services', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM services WHERE available = true ORDER BY name'
        )
        res.json(rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Ошибка при получении списка услуг' })
    }
})

// Получение информации о конкретной услуге
app.get('/api/services/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM services WHERE id = $1',
            [req.params.id]
        )
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' })
        }
        
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Ошибка при получении информации об услуге' })
    }
})

// Получение списка категорий
app.get('/api/categories', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM vehicle_categories');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение услуг по категории
app.get('/api/services/category/:categoryId', async (req, res) => {
    try {
        const { categoryId } = req.params;
        const result = await pool.query(
            'SELECT * FROM services WHERE category_id = $1',
            [categoryId]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение информации о конкретной категории
app.get('/api/categories/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM vehicle_categories WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Категория не найдена' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении категории' });
    }
});

// Создание записи (appointment)
app.post('/api/appointments', authenticate, async (req, res) => {
    const { serviceId, startTime, vehicleInfo, email } = req.body;
    console.log('BODY:', req.body); // Логируем тело запроса
    console.log('EMAIL:', email);   // Логируем email
    try {
        // Проверяем доступность услуги
        const serviceCheck = await pool.query(
            'SELECT price, name FROM services WHERE id = $1',
            [serviceId]
        );
        if (serviceCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Услуга недоступна для записи' });
        }
        const { price, name: serviceName } = serviceCheck.rows[0];

        // Проверяем пересечение записей
        const overlapCheck = await pool.query(
            `SELECT id FROM appointments 
             WHERE service_id = $1 
             AND start_time = $2`,
            [serviceId, startTime]
        );
        if (overlapCheck.rows.length > 0) {
            return res.status(400).json({ error: 'Выбранное время уже занято' });
        }

        // Создаём запись
        const { rows } = await pool.query(
            `INSERT INTO appointments 
             (user_id, service_id, start_time, vehicle_info, status, price, email) 
             VALUES ($1, $2, $3, $4, 'confirmed', $5, $6) RETURNING *`,
            [req.user.userId, serviceId, startTime, vehicleInfo, price, email]
        );

        // Отправляем уведомление на email
        await sendAppointmentEmail(email, rows[0], serviceName);

        res.status(201).json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при создании записи: ' + err.message });
    }
});

// Получение всех записей пользователя
app.get('/api/appointments', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, s.name as service_name, s.price, s.duration, s.image_url
             FROM appointments a
             JOIN services s ON a.service_id = s.id
             WHERE a.user_id = $1
             ORDER BY a.start_time DESC`,
            [req.user.userId]
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении записей' });
    }
});

// Получение всех записей (appointments) для админа
app.get('/api/admin/appointments', authenticate, checkAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT a.*, u.full_name as user_name, s.name as service_name 
             FROM appointments a
             JOIN users u ON a.user_id = u.id
             JOIN services s ON a.service_id = s.id
             ORDER BY a.start_time DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении записей' });
    }
});

// Обновление статуса записи (appointment)
app.put('/api/admin/appointments/:id/status', authenticate, checkAdmin, async (req, res) => {
    const { status } = req.body;
    try {
        const { rows } = await pool.query(
            `UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *`,
            [status, req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при обновлении статуса' });
    }
});

// Удаление записи (appointment)
app.delete('/api/appointments/:id', authenticate, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'DELETE FROM appointments WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, req.user.userId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена или у вас нет прав на её удаление' });
        }
        res.json({ message: 'Запись успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении записи' });
    }
});



// Удаление записи (appointment) админом
app.delete('/api/admin/appointments/:id', authenticate, checkAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            'DELETE FROM appointments WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Запись не найдена' });
        }
        res.json({ message: 'Запись успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении записи' });
    }
});

// Административные функции

// Добавление новой услуги (требуются права администратора)
app.post('/api/admin/services', authenticate, checkAdmin, async (req, res) => {
    const { name, description, price, duration, imageUrl, categoryId } = req.body
    
    try {
        const { rows } = await pool.query(
            `INSERT INTO services 
             (name, description, price, duration, image_url, category_id) 
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [name, description, price, duration, imageUrl, categoryId]
        )
        
        res.status(201).json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Ошибка при добавлении услуги: ' + err.message })
    }
})

// Обновление информации об услуге (требуются права администратора)
app.put('/api/admin/services/:id', authenticate, checkAdmin, async (req, res) => {
    const { name, description, price, duration, available, imageUrl } = req.body
    
    try {
        const { rows } = await pool.query(
            `UPDATE services 
             SET name = $1, description = $2, price = $3, duration = $4, 
                 available = $5, image_url = $6
             WHERE id = $7
             RETURNING *`,
            [name, description, price, duration, available, imageUrl, req.params.id]
        )
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' })
        }
        
        res.json(rows[0])
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: 'Ошибка при обновлении информации об услуге' })
    }
})

// Удаление услуги (требуются права администратора)
app.delete('/api/admin/services/:id', authenticate, checkAdmin, async (req, res) => {
    try {
        // Сначала проверяем, есть ли активные записи для этой услуги
        const { rows: activeAppointments } = await pool.query(
            `SELECT id FROM appointments 
             WHERE service_id = $1 
             AND status IN ('confirmed', 'in_progress')`,
            [req.params.id]
        );


        
        if (activeAppointments.length > 0) {
            return res.status(400).json({ error: 'Невозможно удалить услугу, у которой есть активные записи' });
        }
        
        // Удаляем услугу
        const { rows } = await pool.query(
            'DELETE FROM services WHERE id = $1 RETURNING *',
            [req.params.id]
        );
        
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Услуга не найдена' });
        }
        
        res.json({ message: 'Услуга успешно удалена' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при удалении услуги: ' + err.message });
    }
});

// Получение всех отзывов (требуются права администратора)
app.get('/api/admin/reviews', authenticate, checkAdmin, async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT r.*, u.full_name, s.name as service_name 
             FROM reviews r
             JOIN users u ON r.user_id = u.id
             JOIN services s ON r.service_id = s.id
             ORDER BY r.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка при получении списка отзывов' });
    }
});

const PORT = process.env.PORT || 4000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})