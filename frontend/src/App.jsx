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
  const [amountType, setAmountType] = useState('ETH');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [view, setView] = useState('create'); 
  const [mnemonicInput, setMnemonicInput] = useState('');

  const truncateAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const copyToClipboard = () => {
    if (wallet && wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      alert('Address copied to clipboard!');
    }
  };

  const fetchWalletData = async (address) => {
    setError('');
    try {
      const balanceRes = await fetch(`${API_BASE_URL}/balance/${address}`);
      if (!balanceRes.ok) throw new Error('Failed to fetch balance');
      const balanceData = await balanceRes.json();
      setBalance(parseFloat(balanceData.balance).toFixed(4));
      setUsdBalance((parseFloat(balanceData.balance) * 2500).toFixed(2)); 

      const historyRes = await fetch(`${API_BASE_URL}/transactions/${address}`);
      if (!historyRes.ok) throw new Error('Failed to fetch transactions');
      const historyData = await historyRes.json();
      setTransactions(historyData);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
      setError('Failed to fetch wallet data.');
    }
  };

  const createWallet = () => {
    const newWallet = ethers.Wallet.createRandom();
    localStorage.setItem('mnemonic', newWallet.mnemonic.phrase);
    alert(`Your new 12-word recovery phrase is:\n\n${newWallet.mnemonic.phrase}\n\nPlease save it securely!`);
    setWallet(newWallet);
    fetchWalletData(newWallet.address);
  };

  const importWallet = () => {
    setError('');
    try {
      if (mnemonicInput.trim().split(' ').length !== 12) {
        setError('Please enter a valid 12-word mnemonic phrase.');
        return;
      }
      const importedWallet = ethers.Wallet.fromPhrase(mnemonicInput.trim());
      localStorage.setItem('mnemonic', importedWallet.mnemonic.phrase);
      setWallet(importedWallet);
      fetchWalletData(importedWallet.address);
    } catch (e) {
      setError('Invalid mnemonic phrase. Please check and try again.');
    }
  };
  
  useEffect(() => {
    const savedMnemonic = localStorage.getItem('mnemonic');
    if (savedMnemonic) {
      try {
        const loadedWallet = ethers.Wallet.fromPhrase(savedMnemonic);
        setWallet(loadedWallet);
        fetchWalletData(loadedWallet.address);
      } catch (e) {
        console.error("Failed to load wallet from saved mnemonic:", e);
        localStorage.removeItem('mnemonic');
      }
    }
  }, []);
  
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
      if (!initRes.ok) {
        const errData = await initRes.json();
        throw new Error(errData.error || 'Failed to initiate transfer.');
      }
      const { message, ethAmount } = await initRes.json();
      
      const signature = await wallet.signMessage(message);

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

      if (!executeRes.ok) {
        const errData = await executeRes.json();
        throw new Error(errData.error || 'Failed to execute transfer.');
      }
      const executeData = await executeRes.json();

      if (executeData.success) {
        alert('Transfer successful!');
        setRecipient('');
        setAmount('');
        fetchWalletData(wallet.address);
      } else {
        setError(executeData.error || 'Transfer failed.');
      }
    } catch (err) {
      console.error("Error during transfer:", err);
      setError(err.message || 'An error occurred during the transfer.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!wallet) {
    return (
      <div className="wallet-container create-wallet-view">
        <h1>Welcome to CypherD</h1>
        {view === 'create' && (
          <>
            <p>Create a new secure wallet to get started.</p>
            <button className="btn" onClick={createWallet}>Create New Wallet</button>
            <p style={{marginTop: '20px', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => { setView('import'); setError(''); }}>
              Or import an existing wallet
            </p>
          </>
        )}
        {view === 'import' && (
          <>
            <p>Enter your 12-word secret recovery phrase.</p>
            <textarea
              style={{width: '100%', boxSizing: 'border-box', height: '80px', backgroundColor: '#252525', color: 'white', borderRadius: '12px', padding: '10px', border: '1px solid #333', resize: 'none'}}
              value={mnemonicInput}
              onChange={(e) => setMnemonicInput(e.target.value)}
              placeholder="word1 word2 word3..."
            />
            <button className="btn" style={{marginTop: '10px'}} onClick={importWallet}>Import Wallet</button>
            {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
            <p style={{marginTop: '20px', cursor: 'pointer', color: 'var(--text-secondary)'}} onClick={() => setView('create')}>
              Back to create
            </p>
          </>
        )}
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

//End