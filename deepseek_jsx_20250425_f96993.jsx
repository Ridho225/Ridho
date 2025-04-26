import React, { useState, useEffect } from 'react';
import SPRTokenManager from './SPRTokenManager';

const TokenList = ({ category }) => {
  const [selectedChain, setSelectedChain] = useState('all');
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Daftar chain yang tersedia
  const availableChains = [
    { id: 'all', name: 'All Chains' },
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'binance', name: 'Binance' },
    { id: 'solana', name: 'Solana' },
    // Tambahkan chain lainnya...
  ];

  // Memuat token saat category atau selectedChain berubah
  useEffect(() => {
    setIsLoading(true);
    
    // Simulasikan loading dari API
    setTimeout(() => {
      const filteredTokens = SPRTokenManager.getTokensByCategory(category, selectedChain);
      setTokens(filteredTokens);
      setIsLoading(false);
    }, 500);
  }, [category, selectedChain]);

  return (
    <div className="token-list-container">
      <div className="chain-selector">
        <h2>{category.charAt(0).toUpperCase() + category.slice(1)} Tokens</h2>
        <select 
          value={selectedChain}
          onChange={(e) => setSelectedChain(e.target.value)}
        >
          {availableChains.map(chain => (
            <option key={chain.id} value={chain.id}>{chain.name}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="loading">Loading tokens...</div>
      ) : tokens.length === 0 ? (
        <div className="empty">No tokens found in this category</div>
      ) : (
        <table className="token-table">
          <thead>
            <tr>
              <th>Token</th>
              <th>Price</th>
              <th>24h Change</th>
              <th>Volume (24h)</th>
              <th>Chain</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map(token => (
              <tr key={token.id}>
                <td>
                  <div className="token-info">
                    <img src={token.logo} alt={token.symbol} className="token-logo" />
                    <div>
                      <div className="token-name">{token.name}</div>
                      <div className="token-symbol">{token.symbol}</div>
                    </div>
                  </div>
                </td>
                <td>${token.price.toLocaleString()}</td>
                <td className={token.change24h >= 0 ? 'positive' : 'negative'}>
                  {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                </td>
                <td>${(token.volume24h / 1000000).toFixed(1)}M</td>
                <td>
                  <span className={`chain-tag ${token.chain}`}>
                    {token.chain}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Contoh penggunaan komponen
const App = () => {
  const [activeCategory, setActiveCategory] = useState('trending');

  const categories = [
    'trending', 'new', 'gainer', 'loser', 
    'verified', 'volume', 'aipick', 'whale', 'meme'
  ];

  return (
    <div className="app">
      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category}
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </button>
        ))}
      </div>
      
      <TokenList category={activeCategory} />
    </div>
  );
};

export default App;