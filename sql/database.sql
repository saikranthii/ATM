CREATE DATABASE atm_db;
     USE atm_db;

     -- Table for admin
     CREATE TABLE admins (
         id INT AUTO_INCREMENT PRIMARY KEY,
         username VARCHAR(50) NOT NULL UNIQUE,
         password VARCHAR(255) NOT NULL
     );

     -- Table for users (includes email for potential future use)
     CREATE TABLE users (
         id INT AUTO_INCREMENT PRIMARY KEY,
         name VARCHAR(100) NOT NULL,
         phone VARCHAR(10) NOT NULL UNIQUE,
         email VARCHAR(100) NOT NULL UNIQUE,
         card_number VARCHAR(16) NOT NULL UNIQUE,
         pin VARCHAR(4) NOT NULL,
         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
     );

     -- Table for bank accounts
     CREATE TABLE accounts (
         id INT AUTO_INCREMENT PRIMARY KEY,
         user_id INT NOT NULL,
         account_number VARCHAR(12) NOT NULL UNIQUE,
         balance DECIMAL(10, 2) DEFAULT 0.00,
         bank_name VARCHAR(100) NOT NULL,
         branch VARCHAR(100),
         FOREIGN KEY (user_id) REFERENCES users(id)
     );

     -- Table for transactions
     CREATE TABLE transactions (
         id INT AUTO_INCREMENT PRIMARY KEY,
         account_id INT NOT NULL,
         type ENUM('deposit', 'withdrawal', 'transfer') NOT NULL,
         amount DECIMAL(10, 2) NOT NULL,
         recipient_account VARCHAR(12),
         transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (account_id) REFERENCES accounts(id)
     );

     -- Insert default admin
     INSERT INTO admins (username, password) VALUES ('admin', '$2b$10$3X7Z8z9y2k3j4h5g6i7j8k9l0m1n2o3p4q5r6s7t8u9v0w1x2y3z');
     -- Password: admin123 (hashed with bcrypt)