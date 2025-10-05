# CypherD Web3 Wallet

A mock Web3 wallet application built with React frontend and Flask backend, featuring wallet creation, ETH transfers, USD conversion, and real-world notifications.

## 🚀 Features

- **Wallet Management**: Create new wallets or import existing ones using 12-word mnemonic phrases
- **Balance Display**: View ETH balance with USD equivalent
- **Send Transfers**: Send ETH or USD amounts with real-time price conversion
- **Transaction History**: View complete transaction history
- **Real Notifications**: Email notifications for successful transfers
- **Secure Signing**: Digital signature verification for all transactions

## 🛠️ Tech Stack

### Frontend
- React 19.1.1
- Vite 7.1.7
- Ethers.js 6.15.0
- Modern CSS with dark theme

### Backend
- Flask 3.1.2
- MySQL Database
- Web3.py for signature verification
- Skip API for USD/ETH conversion
- SMTP for email notifications

## 📋 Prerequisites

- Node.js (v16 or higher)
- Python 3.8+
- MySQL Server
- Git

## 🚀 Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd Web3Wallet
```

### 2. Database Setup

1. **Install MySQL** and create a database:
```sql
CREATE DATABASE web3_wallet;
```

2. **Run the database schema**:
```sql
-- This script resets and fixes both tables correctly.
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS wallets;

CREATE TABLE wallets (
  address VARCHAR(42) PRIMARY KEY,
  balance DECIMAL(36, 18) NOT NULL
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sender VARCHAR(42) NOT NULL,
  recipient VARCHAR(42) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender) REFERENCES wallets(address),
  FOREIGN KEY (recipient) REFERENCES wallets(address)
);
```

### 3. Backend Setup

1. **Navigate to backend directory**:
```bash
cd backend/venv
```

2. **Create virtual environment** (if not already created):
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

3. **Install dependencies**:
```bash
pip install -r requirements.txt
```

4. **Configure environment variables**:
Create a `.env` file in `backend/venv/` with:
```env
DB_HOST=localhost
DB_USER=your_mysql_username
DB_PASSWORD=your_mysql_password
DB_DATABASE=web3_wallet
EMAIL_ADDRESS=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
RECIPIENT_EMAIL=recipient@gmail.com
```

5. **Start the backend server**:
```bash
python app.py
```
The backend will run on `http://localhost:3001`

### 4. Frontend Setup

1. **Navigate to frontend directory**:
```bash
cd frontend
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start the development server**:
```bash
npm run dev
```
The frontend will run on `http://localhost:5173`

## 🎯 How to Use

### 1. Create or Import Wallet
- **Create New**: Click "Create New Wallet" to generate a 12-word recovery phrase
- **Import Existing**: Click "Or import an existing wallet" and enter your 12-word phrase
- **Important**: Save your recovery phrase securely!

### 2. View Balance
- Your wallet balance is displayed in ETH and USD
- New wallets receive a random starting balance (1-10 ETH)

### 3. Send Transfers
- Enter recipient address (must be valid Ethereum address)
- Enter amount in ETH or USD
- Toggle between ETH/USD using the buttons
- Click "Send ETH" to initiate transfer
- Sign the message to approve the transaction

### 4. View Transaction History
- All transactions are displayed in the history section
- Green arrows (↓) indicate received funds
- Red arrows (↑) indicate sent funds

## 🔒 Security Features

- **Digital Signatures**: All transactions require wallet signature
- **Signature Verification**: Backend verifies all signatures before processing
- **Slippage Protection**: USD transfers include 1% price tolerance check
- **Database Transactions**: Atomic operations ensure data consistency

## 📧 Notifications

The app sends real email notifications for successful transfers using SMTP. Configure your email settings in the `.env` file.

## 🧪 Testing the Application

1. **Create a wallet** and note the recovery phrase
2. **Open another browser/incognito** and import the same wallet
3. **Send a test transaction** between the two instances
4. **Check email** for notification
5. **Verify transaction history** updates correctly

## 🐛 Troubleshooting

### Common Issues:

1. **Database Connection Error**:
   - Verify MySQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. **Email Notifications Not Working**:
   - Use App Password for Gmail (not regular password)
   - Enable 2-factor authentication on Gmail
   - Check email credentials in `.env`

3. **Frontend Can't Connect to Backend**:
   - Ensure backend is running on port 3001
   - Check CORS settings
   - Verify API_BASE_URL in frontend

## 📁 Project Structure

```
Web3Wallet/
├──.env               # Environment variables
├── backend/
│   └── venv/
│       ├── app.py              # Flask backend server
│       └── requirements.txt    # Python dependencies
│   
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main React component
│   │   ├── App.css            # Styling
│   │   └── main.jsx           # React entry point
│   ├── package.json           # Node dependencies
│   └── vite.config.js         # Vite configuration
└── README.md                  # This file
```

## 🎉 Assignment Requirements Coverage

✅ **Create a Wallet & Show the Balance**
- 12-word mnemonic generation and import
- Random starting balance (1-10 ETH)
- Balance display in ETH and USD

✅ **Send a Transfer**
- ETH and USD amount input
- Skip API integration for price conversion
- Digital signature verification
- Slippage protection (1% tolerance)

✅ **Show Transaction History**
- Complete transaction records
- Real-time history updates
- Sent/received indicators

✅ **Send Real-World Notifications**
- SMTP email integration
- Transaction success notifications
