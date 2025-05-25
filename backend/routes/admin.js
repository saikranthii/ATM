const express = require('express');
const router = express.Router();
const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const authenticateAdmin = require('../middleware/auth');
console.log('Imported authenticateAdmin in admin.js:', authenticateAdmin);

router.post('/signup', async (req, res) => {
    let { name, email, bank_id, location, password } = req.body;

    if (!name || !email || !bank_id || !location || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (!email.includes('@')) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        const [existingAdmin] = await db.promise().query(
            'SELECT id FROM admins WHERE email = ?',
            [email]
        );
        if (existingAdmin.length > 0) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.promise().query(
            'INSERT INTO admins (name, email, bank_id, location, password) VALUES (?, ?, ?, ?, ?)',
            [name, email, bank_id, location, hashedPassword]
        );

        res.status(201).json({ message: 'Admin registered successfully' });
    } catch (error) {
        console.error('Admin signup error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ message: 'Database error: Admins table not found' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [admins] = await db.promise().query(
            'SELECT * FROM admins WHERE email = ?',
            [email]
        );
        if (admins.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const admin = admins[0];
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: admin.id, email: admin.email, role: 'admin' },
            process.env.JWT_SECRET || 'your_jwt_secret',
            { expiresIn: '1h' }
        );

        res.json({ token });
    } catch (error) {
        console.error('Admin login error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ message: 'Server error' });
    }
});

router.get('/profile', authenticateAdmin, async (req, res) => {
    console.log('Inside /profile route, req.admin:', req.admin);
    try {
        const [admins] = await db.promise().query(
            'SELECT id, name, email, bank_id, location FROM admins WHERE id = ?',
            [req.admin.id]
        );
        if (admins.length === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.json(admins[0]);
    } catch (error) {
        console.error('Fetch admin profile error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.put('/profile', authenticateAdmin, async (req, res) => {
    let { name, email, bank_id, location, password } = req.body;

    if (!name || !email || !bank_id || !location) {
        return res.status(400).json({ message: 'Name, email, bank ID, and location are required' });
    }

    if (!email.includes('@')) {
        return res.status(400).json({ message: 'Invalid email format' });
    }

    try {
        const updates = { name, email, bank_id, location };
        if (password) {
            updates.password = await bcrypt.hash(password, 10);
        }

        const [result] = await db.promise().query(
            'UPDATE admins SET name = ?, email = ?, bank_id = ?, location = ?' +
            (password ? ', password = ?' : '') +
            ' WHERE id = ?',
            password
                ? [name, email, bank_id, location, updates.password, req.admin.id]
                : [name, email, bank_id, location, req.admin.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Update admin profile error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Email already exists' });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/users', authenticateAdmin, async (req, res) => {
    let { name, phone, email, card_number, pin, account_number, bank_name, branch, balance } = req.body;

    console.log('Raw user creation request:', req.body);

    name = name ? name.trim() : '';
    phone = phone ? phone.trim() : '';
    email = email ? email.trim() : '';
    card_number = card_number ? card_number.replace(/\s+/g, '') : '';
    pin = pin ? pin.trim() : '';
    account_number = account_number ? account_number.replace(/\s+/g, '') : '';
    bank_name = bank_name ? bank_name.trim() : '';
    branch = branch ? branch.trim() : '';

    const processedInputs = { name, phone, email, card_number, pin, account_number, bank_name, branch, balance };
    console.log('Processed inputs:', processedInputs);

    if (!name || !phone || !email || !card_number || !pin || !account_number || !bank_name || !branch || balance === undefined) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    if (!/^\d+$/.test(card_number) || !/^\d+$/.test(account_number) || !/^\d+$/.test(pin) || !/^\d+$/.test(phone)) {
        return res.status(400).json({ error: 'Card number, account number, PIN, and phone must be numeric digits only' });
    }

    if (card_number.length !== 16) {
        return res.status(400).json({ error: 'Card number must be 16 digits' });
    }
    if (account_number.length !== 12) {
        return res.status(400).json({ error: 'Account number must be 12 digits' });
    }
    if (pin.length !== 4) {
        return res.status(400).json({ error: 'PIN must be 4 digits' });
    }
    if (phone.length !== 10) {
        return res.status(400).json({ error: 'Phone number must be 10 digits' });
    }
    if (!email.includes('@')) {
        return res.status(400).json({ error: 'Email must include @' });
    }

    if (isNaN(balance) || balance < 0) {
        return res.status(400).json({ error: 'Balance must be a valid non-negative number' });
    }

    try {
        const [userResult] = await db.promise().query(
            'INSERT INTO users (name, email, card_number, pin, phone, account_number, bank_name, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [name, email, card_number, pin, phone, account_number, bank_name, branch]
        );
        const userId = userResult.insertId;
        await db.promise().query(
            'INSERT INTO accounts (user_id, account_number, balance, bank_name, branch) VALUES (?, ?, ?, ?, ?)',
            [userId, account_number, balance, bank_name, branch]
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Create user error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('card_number')) {
                return res.status(400).json({ error: 'Card number already exists' });
            }
            if (error.message.includes('account_number')) {
                return res.status(400).json({ error: 'Account number already exists' });
            }
        }
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ error: 'Database error: Table not found' });
        }
        res.status(500).json({ error: `Server error: ${error.message}` });
    }
});

router.get('/users', authenticateAdmin, async (req, res) => {
    try {
        const [users] = await db.promise().query(
            'SELECT id, name, phone, email, card_number, pin, account_number, bank_name, branch, ' +
            '(SELECT balance FROM accounts WHERE user_id = users.id LIMIT 1) as balance ' +
            'FROM users'
        );
        res.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.put('/users/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;
    let { name, phone, email, card_number, pin, account_number, bank_name, branch, balance } = req.body;

    if (!name || !phone || !email || !card_number || !pin || !account_number || !bank_name || !branch || balance === undefined) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    if (!/^\d+$/.test(card_number) || !/^\d+$/.test(account_number) || !/^\d+$/.test(pin) || !/^\d+$/.test(phone)) {
        return res.status(400).json({ message: 'Card number, account number, PIN, and phone must be numeric digits only' });
    }

    if (card_number.length !== 16 || account_number.length !== 12 || pin.length !== 4 || phone.length !== 10 || !email.includes('@')) {
        return res.status(400).json({ message: 'Invalid input: Card number (16 digits), account number (12 digits), PIN (4 digits), phone (10 digits), email must include @' });
    }

    if (isNaN(balance) || balance < 0) {
        return res.status(400).json({ message: 'Balance must be a valid non-negative number' });
    }

    try {
        const [userResult] = await db.promise().query(
            'UPDATE users SET name = ?, phone = ?, email = ?, card_number = ?, pin = ?, account_number = ?, bank_name = ?, branch = ? WHERE id = ?',
            [name, phone, email, card_number, pin, account_number, bank_name, branch, id]
        );

        if (userResult.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const [accountResult] = await db.promise().query(
            'UPDATE accounts SET account_number = ?, balance = ?, bank_name = ?, branch = ? WHERE user_id = ?',
            [account_number, balance, bank_name, branch, id]
        );

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Update user error:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            if (error.message.includes('card_number')) {
                return res.status(400).json({ message: 'Card number already exists' });
            }
            if (error.message.includes('account_number')) {
                return res.status(400).json({ message: 'Account number already exists' });
            }
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.delete('/users/:id', authenticateAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await db.promise().query('DELETE FROM transactions WHERE user_id = ?', [id]);
        await db.promise().query('DELETE FROM accounts WHERE user_id = ?', [id]);
        const [result] = await db.promise().query('DELETE FROM users WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

module.exports = router;