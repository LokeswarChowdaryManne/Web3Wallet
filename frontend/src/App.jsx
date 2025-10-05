// src/App.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import './App.css';

const API_BASE_URL = 'http://localhost:3001';

function App() {
  const [wallet, setWallet] = useState(null);
  const [balance, setBalance] = useState('0.00');
  const [usdBalance, setUsdBalance] = useState('0.00');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [amountType, setAmountType] = useState('ETH'); // 'ETH' or 'USD'
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // --- Utility Functions ---
  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(wallet.address);
    alert('Address copied to clipboard!');
  };

  // --- API Functions ---
  const fetchWalletData = async (address) => {
    try {
      // Fetch balance
      const balanceRes = await fetch(`${API_BASE_URL}/balance/${address}`);
      const balanceData = await balanceRes.json();
      setBalance(parseFloat(balanceData.balance).toFixed(4));
      // Simple mock USD conversion for display
      setUsdBalance((parseFloat(balanceData.balance) * 2500).toFixed(2)); 

      // Fetch transaction history
      const historyRes = await fetch(`${API_BASE_URL}/transactions/${address}`);
      const historyData = await historyRes.json();
      setTransactions(historyData);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
      setError('Failed to fetch wallet data.');
    }
  };

  // --- Wallet Management ---
  const createWallet = () => {
    const newWallet = ethers.Wallet.createRandom();
    localStorage.setItem('mnemonic', newWallet.mnemonic.phrase);
    setWallet(newWallet);
    fetchWalletData(newWallet.address);
  };
  
  // On component mount, check for existing wallet
  useEffect(() => {
    const savedMnemonic = localStorage.getItem('mnemonic');
    if (savedMnemonic) {
      const loadedWallet = ethers.Wallet.fromPhrase(savedMnemonic);
      setWallet(loadedWallet);
      fetchWalletData(loadedWallet.address);
    }
  }, []);
  
  // --- Transaction Handling ---
  const handleSend = async () => {
    if (!recipient || !amount) {
      setError("Please enter a recipient and amount.");
      return;
    }
    if (!ethers.isAddress(recipient)) {
        setError("Invalid recipient address.");
        return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Step 1: Initiate Transfer with backend to get the message
      const initRes = await fetch(`${API_BASE_URL}/initiate-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: wallet.address,
          recipient,
          amount,
          type: amountType,
        }),
      });
      const { message, ethAmount } = await initRes.json();
      
      // Step 2: Sign the message on the frontend
      const signature = await wallet.signMessage(message);

      // Step 3: Execute the transfer with the signature
      const executeRes = await fetch(`${API_BASE_URL}/execute-transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              message,
              signature,
              sender: wallet.address,
              recipient,
              ethAmount,
          }),
      });
      const executeData = await executeRes.json();

      if (executeData.success) {
        alert('Transfer successful!');
        setRecipient('');
        setAmount('');
        // Refresh data after successful transfer
        fetchWalletData(wallet.address);
      } else {
        setError(executeData.error || 'Transfer failed.');
      }
    } catch (err) {
      console.error("Error during transfer:", err);
      setError('An error occurred during the transfer.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Render Logic ---
  if (!wallet) {
    return (
      <div className="wallet-container create-wallet-view">
        <h1>Welcome to CypherD</h1>
        <p>Create a new secure wallet to get started.</p>
        <button className="btn" onClick={createWallet}>Create New Wallet</button>
      </div>
    );
  }

  return (
    <div className="wallet-container">
      <header className="wallet-header">
        <h1>CypherD</h1>
        <div className="wallet-address">
          <span>{truncateAddress(wallet.address)}</span>
          <button onClick={copyToClipboard}>📋</button>
        </div>
      </header>

      <section className="balance-card">
        <h2 className="balance-eth">{balance} ETH</h2>
        <p className="balance-usd">${usdBalance}</p>
        <div className="action-buttons">
          <button className="btn">Send</button>
          <button className="btn">Receive</button>
        </div>
      </section>

      <section className="send-form">
        <h2>Send</h2>
        <div className="input-group">
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <div className="input-group">
          <div className="amount-input-wrapper">
            <input
              type="text"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="amount-toggle">
              <button
                className={amountType === 'ETH' ? 'active' : ''}
                onClick={() => setAmountType('ETH')}
              >
                ETH
              </button>
              <button
                className={amountType === 'USD' ? 'active' : ''}
                onClick={() => setAmountType('USD')}
              >
                USD
              </button>
            </div>
          </div>
        </div>
        <button className="btn" onClick={handleSend} disabled={isLoading}>
          {isLoading ? 'Sending...' : 'Send ETH'}
        </button>
        {error && <p style={{ color: 'var(--red)', textAlign: 'center' }}>{error}</p>}
      </section>

      <section className="transaction-history">
        <h2>Transaction History</h2>
        <ul className="transaction-list">
          {transactions.map((tx) => (
            <li key={tx.id} className="transaction-item">
              <div className="transaction-details">
                <span className="transaction-arrow">
                  {tx.sender.toLowerCase() === wallet.address.toLowerCase() ? '↑' : '↓'}
                </span>
                <span>
                  {tx.sender.toLowerCase() === wallet.address.toLowerCase()
                    ? truncateAddress(tx.recipient)
                    : truncateAddress(tx.sender)}
                </span>
              </div>
              <span
                className={`transaction-amount ${
                  tx.sender.toLowerCase() === wallet.address.toLowerCase() ? 'sent' : 'received'
                }`}
              >
                {tx.sender.toLowerCase() === wallet.address.toLowerCase() ? '-' : '+'}
                {parseFloat(tx.amount).toFixed(4)} ETH
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;