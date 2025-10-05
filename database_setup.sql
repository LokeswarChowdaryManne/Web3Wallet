-- CypherD Web3 Wallet Database Setup
-- This script creates the database and tables for the Web3 wallet application

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS web3_wallet;
USE web3_wallet;

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;

-- Create wallets table
CREATE TABLE wallets (
  address VARCHAR(42) PRIMARY KEY,
  balance DECIMAL(36, 18) NOT NULL DEFAULT 0
);

-- Create transactions table
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(42) NOT NULL,
  recipient VARCHAR(42) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender) REFERENCES wallets(address),
  FOREIGN KEY (recipient) REFERENCES wallets(address)
);

-- Insert some sample data (optional)
-- INSERT INTO wallets (address, balance) VALUES 
-- ('0x742d35Cc6634C0532925a3b8D4C9db96c728b0B4', 5.5),
-- ('0x1234567890123456789012345678901234567890', 2.3);

-- Show tables to verify setup
SHOW TABLES;
