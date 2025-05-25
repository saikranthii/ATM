const express = require('express');
const router = express.Router();
const db = require('../db');

const authenticateAdmin = require('../middleware/auth');

router.post('/validate-card', async (req, res) => {
    let { card_number } = req.body;

    console.log('Validate card request:', req.body);

    if (!card_number) {
        return res.status(400).json({ message: 'Card number is required' });
    }
    card_number = card_number.replace(/\s+/g, '');
    if (card_number.length !== 16) {
        return res.status(400).json({ message: 'Invalid card number (16 digits)' });
    }
    if (!/^\d+$/.test(card_number)) {
        return res.status(400).json({ message: 'Card number must be numeric digits only' });
    }

    try {
        const [results] = await db.promise().query(
            'SELECT id, name, email FROM users WHERE card_number = ?',
            [card_number]
        );
        if (results.length === 0) {
            return res.status(401).json({ message: 'Invalid card number' });
        }

        const user = results[0];
        res.json({ userId: user.id, name: user.name, email: user.email });
    } catch (error) {
        console.error('Card validation error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ message: 'Database error: Users table not found' });
        }
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/validate-pin', async (req, res) => {
    const { userId, pin } = req.body;

    console.log('Validate PIN request:', { userId, pin });

    if (!userId || !pin) {
        return res.status(400).json({ message: 'User ID and PIN are required' });
    }
    const trimmedPin = pin.trim();
    if (trimmedPin.length !== 4) {
        return res.status(400).json({ message: 'Invalid PIN (4 digits)' });
    }
    if (!/^\d+$/.test(trimmedPin)) {
        return res.status(400).json({ message: 'PIN must be numeric digits only' });
    }

    try {
        const [results] = await db.promise().query(
            'SELECT pin FROM users WHERE id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        const user = results[0];
        if (user.pin !== trimmedPin) {
            return res.status(401).json({ message: 'Invalid PIN' });
        }

        res.json({ message: 'PIN validated' });
    } catch (error) {
        console.error('PIN validation error:', {
            message: error.message,
            code: error.code,
            stack: error.stack
        });
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.get('/balance/:userId', async (req, res) => {
    const { userId } = req.params;

    console.log('Fetch balance request for userId:', userId);

    try {
        const [results] = await db.promise().query(
            'SELECT balance FROM accounts WHERE user_id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }
        res.json({ balance: results[0].balance });
    } catch (error) {
        console.error('Fetch balance error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/withdraw/:userId', async (req, res) => {
    const { userId } = req.params;
    const { amount } = req.body;

    console.log('Withdraw request:', { userId, amount });

    if (!amount || amount < 100 || amount % 100 !== 0) {
        return res.status(400).json({ message: 'Amount must be at least ₹100 and in multiples of 100' });
    }
    try {
        const [results] = await db.promise().query(
            'SELECT balance FROM accounts WHERE user_id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }
        const balance = results[0].balance;
        if (balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        await db.promise().query(
            'UPDATE accounts SET balance = balance - ? WHERE user_id = ?',
            [amount, userId]
        );
        await db.promise().query(
            'INSERT INTO transactions (user_id, type, amount, transaction_date) VALUES (?, ?, ?, NOW())',
            [userId, 'WITHDRAW', amount]
        );
        res.json({ message: 'Withdrawal successful' });
    } catch (error) {
        console.error('Withdraw error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/deposit/:userId', async (req, res) => {
    const { userId } = req.params;
    const { amount } = req.body;

    console.log('Deposit request:', { userId, amount });

    if (!amount || amount < 100 || amount % 100 !== 0) {
        return res.status(400).json({ message: 'Amount must be at least ₹100 and in multiples of 100' });
    }
    try {
        const [results] = await db.promise().query(
            'SELECT balance FROM accounts WHERE user_id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }
        await db.promise().query(
            'UPDATE accounts SET balance = balance + ? WHERE user_id = ?',
            [amount, userId]
        );
        await db.promise().query(
            'INSERT INTO transactions (user_id, type, amount, transaction_date) VALUES (?, ?, ?, NOW())',
            [userId, 'DEPOSIT', amount]
        );
        res.json({ message: 'Deposit successful' });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.get('/statement/:userId', async (req, res) => {
    const { userId } = req.params;

    console.log('Fetch statement request for userId:', userId);

    try {
        const [results] = await db.promise().query(
            'SELECT type, amount, recipient_account, transaction_date ' +
            'FROM transactions WHERE user_id = ? ' +
            'ORDER BY transaction_date DESC',
            [userId]
        );
        res.json(results);
    } catch (error) {
        console.error('Statement error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/transfer/:userId', async (req, res) => {
    const { userId } = req.params;
    let { recipient_account, amount } = req.body;

    console.log('Transfer request:', { userId, recipient_account, amount });

    if (!recipient_account) {
        return res.status(400).json({ message: 'Recipient account number is required' });
    }
    recipient_account = recipient_account.replace(/\s+/g, '');
    if (recipient_account.length !== 12) {
        return res.status(400).json({ message: 'Recipient account number must be 12 digits' });
    }
    if (!/^\d+$/.test(recipient_account)) {
        return res.status(400).json({ message: 'Recipient account number must be numeric digits only' });
    }
    if (!amount || amount < 100) {
        return res.status(400).json({ message: 'Amount must be at least ₹100' });
    }
    try {
        const [sender] = await db.promise().query(
            'SELECT balance FROM accounts WHERE user_id = ?',
            [userId]
        );
        if (sender.length === 0) {
            return res.status(404).json({ message: 'Sender account not found' });
        }
        if (sender[0].balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        const [recipient] = await db.promise().query(
            'SELECT user_id FROM accounts WHERE account_number = ?',
            [recipient_account]
        );
        if (recipient.length === 0) {
            return res.status(404).json({ message: 'Recipient account not found' });
        }
        await db.promise().query(
            'UPDATE accounts SET balance = balance - ? WHERE user_id = ?',
            [amount, userId]
        );
        await db.promise().query(
            'UPDATE accounts SET balance = balance + ? WHERE account_number = ?',
            [amount, recipient_account]
        );
        await db.promise().query(
            'INSERT INTO transactions (user_id, type, amount, recipient_account, transaction_date) VALUES (?, ?, ?, ?, NOW())',
            [userId, 'TRANSFER', amount, recipient_account]
        );
        res.json({ message: 'Transfer successful' });
    } catch (error) {
        console.error('Transfer error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/pin-change/:userId', async (req, res) => {
    const { userId } = req.params;
    let { account_number, current_pin, new_pin } = req.body;

    console.log('PIN change request:', { userId, account_number, current_pin, new_pin });

    if (!account_number || !current_pin || !new_pin) {
        return res.status(400).json({ message: 'Account number, current PIN, and new PIN are required' });
    }
    account_number = account_number.replace(/\s+/g, '');
    if (account_number.length !== 12) {
        return res.status(400).json({ message: 'Account number must be 12 digits' });
    }
    if (!/^\d+$/.test(account_number)) {
        return res.status(400).json({ message: 'Account number must be numeric digits only' });
    }
    new_pin = new_pin.trim();
    if (new_pin.length !== 4) {
        return res.status(400).json({ message: 'New PIN must be 4 digits' });
    }
    if (!/^\d+$/.test(new_pin)) {
        return res.status(400).json({ message: 'New PIN must be numeric digits only' });
    }

    try {
        const [account] = await db.promise().query(
            'SELECT user_id FROM accounts WHERE account_number = ? AND user_id = ?',
            [account_number, userId]
        );
        if (account.length === 0) {
            return res.status(404).json({ message: 'Account number does not match user' });
        }
        const [results] = await db.promise().query(
            'SELECT pin FROM users WHERE id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        if (results[0].pin !== current_pin.trim()) {
            return res.status(401).json({ message: 'Incorrect current PIN' });
        }

        await db.promise().query(
            'UPDATE users SET pin = ? WHERE id = ?',
            [new_pin, userId]
        );
        res.json({ message: 'PIN changed successfully' });
    } catch (error) {
        console.error('PIN change error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

router.post('/upi-transfer/:userId', async (req, res) => {
    const { userId } = req.params;
    const { amount, upi_id } = req.body;

    console.log('UPI transfer request:', { userId, amount, upi_id });

    if (!amount || amount < 1) {
        return res.status(400).json({ message: 'Amount must be at least ₹1' });
    }
    try {
        const [results] = await db.promise().query(
            'SELECT balance FROM accounts WHERE user_id = ?',
            [userId]
        );
        if (results.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }
        const balance = results[0].balance;
        if (balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        await db.promise().query(
            'UPDATE accounts SET balance = balance - ? WHERE user_id = ?',
            [amount, userId]
        );
        await db.promise().query(
            'INSERT INTO transactions (user_id, type, amount, recipient_account, transaction_date) VALUES (?, ?, ?, ?, NOW())',
            [userId, 'UPI_TRANSFER', amount, upi_id || 'kranthikandhagatla@oksbi']
        );
        res.json({ message: 'UPI transfer successful' });
    } catch (error) {
        console.error('UPI transfer error:', error);
        res.status(500).json({ message: `Server error: ${error.message}` });
    }
});

module.exports = router;