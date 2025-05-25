const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const db = require('./db');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:8080' }));
app.use(express.json());

// Routes
app.use('/api/admin', require('./routes/admin'));
app.use('/api/atm', require('./routes/atm'));

// Test database connection
db.connect((err) => {
    if (err) {
        console.error('Failed to connect to the database:', err);
        process.exit(1);
    }
    console.log('Connected to the database successfully');
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = { db };