import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { WalletConnectButton } from '@walletconnect/react-walletconnect';
import { detectEthereumProvider } from '@metamask/detect-provider';

// Konfigurasi Supabase
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const SPRExchange = () => {
  // State Management
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [selectedChain, setSelectedChain] = useState('all');
  const [activeTab, setActiveTab] = useState('trending');
  const [tokens, setTokens] = useState([]);
  const [filteredTokens, setFilteredTokens] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null);
  const [goldPrice, setGoldPrice] = useState(0);
  const [tradeSettings, setTradeSettings] = useState({
    slippage: 0.5,
    feeAddress: '0xYourFeeAddress',
    fees: {
      swap: 0.0025,
      createToken: 1.0,
      listing: 0.5,
      futures: 0.0005,
      gold: 0.0015
    }
  });

  // WebSocket Refs
  const priceSocket = useRef(null);
  const futuresSocket = useRef(null);

  // API Endpoints
  const API = {
    gold: 'https://api.metals.live/v1/spot/gold',
    chains: 'https://chainid.network/chains.json',
    futures: 'wss://fstream.binance.com/ws'
  };

  // Inisialisasi Data
  useEffect(() => {
    loadInitialData();
    setupWebSockets();
    
    return () => {
      if (priceSocket.current) priceSocket.current.close();
      if (futuresSocket.current) futuresSocket.current.close();
    };
  }, []);

  // Filter Token berdasarkan Chain
  useEffect(() => {
    if (selectedChain === 'all') {
      setFilteredTokens(tokens);
    } else {
      setFilteredTokens(tokens.filter(token => token.chain === selectedChain));
    }
  }, [selectedChain, tokens]);

  // Fungsi untuk Load Data Awal
  const loadInitialData = async () => {
    try {
      // Load token dari Supabase
      const { data: tokenData } = await supabase
        .from('tokens')
        .select('*');
      
      setTokens(tokenData || []);

      // Load harga emas
      const goldRes = await fetch(API.gold);
      const goldData = await goldRes.json();
      setGoldPrice(goldData.price);

    } catch (error) {
      console.error("Failed to load initial data:", error);
    }
  };

  // Setup WebSocket untuk Harga Real-time
  const setupWebSockets = () => {
    // Harga Spot
    priceSocket.current = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');
    
    priceSocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateTokenPrices(data);
    };

    // Futures
    futuresSocket.current = new WebSocket(`${API.futures}/!markPrice@arr@1s`);
    
    futuresSocket.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      updateFuturesData(data);
    };
  };

  // Update Harga Token
  const updateTokenPrices = (priceData) => {
    setTokens(prevTokens => 
      prevTokens.map(token => {
        const priceUpdate = priceData.find(p => p.s === `${token.symbol}USDT`);
        return priceUpdate ? {
          ...token,
          price: parseFloat(priceUpdate.c),
          change24h: parseFloat(priceUpdate.P),
          volume24h: parseFloat(priceUpdate.q)
        } : token;
      })
    );
  };

  // Update Data Futures
  const updateFuturesData = (futuresData) => {
    setTokens(prevTokens =>
      prevTokens.map(token => {
        const futuresUpdate = futuresData.find(f => f.s === `${token.symbol}USDT`);
        return futuresUpdate ? {
          ...token,
          futuresPrice: parseFloat(futuresUpdate.p),
          fundingRate: parseFloat(futuresUpdate.r)
        } : token;
      })
    );
  };

  // Fungsi Admin
  const adminFunctions = {
    // Token Management
    addToken: async (tokenData) => {
      const { data, error } = await supabase
        .from('tokens')
        .insert([tokenData]);
      
      if (!error) loadInitialData();
      return { success: !error, error };
    },

    updateToken: async (tokenId, updates) => {
      const { data, error } = await supabase
        .from('tokens')
        .update(updates)
        .eq('id', tokenId);
      
      if (!error) loadInitialData();
      return { success: !error, error };
    },

    // Launchpad Management
    createLaunchpad: async (projectData) => {
      const { data, error } = await supabase
        .from('launchpad')
        .insert([projectData]);
      
      return { success: !error, error };
    },

    // Fee Management
    updateFees: (newFees) => {
      setTradeSettings(prev => ({
        ...prev,
        fees: { ...prev.fees, ...newFees }
      }));
      return { success: true };
    }
  };

  // Komponen UI
  return (
    <div className="spr-exchange-app">
      {/* Header dengan Wallet Connection */}
      <header className="app-header">
        <div className="logo">SPR EXCHANGE</div>
        
        <div className="wallet-connector">
          <ChainSelector 
            selectedChain={selectedChain}
            onChange={setSelectedChain}
          />
          
          <WalletConnect 
            connectedWallet={connectedWallet}
            onConnect={setConnectedWallet}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="app-content">
        {/* Sidebar dengan Daftar Token */}
        <aside className="token-sidebar">
          <TokenCategoryTabs 
            activeTab={activeTab}
            onChange={setActiveTab}
          />
          
          <TokenList 
            tokens={filteredTokens}
            onSelect={setSelectedToken}
            category={activeTab}
          />
        </aside>

        {/* Area Trading Utama */}
        <section className="trading-section">
          {selectedToken ? (
            <TokenTradingView 
              token={selectedToken}
              fees={tradeSettings.fees}
              slippage={tradeSettings.slippage}
            />
          ) : (
            <MarketOverview 
              goldPrice={goldPrice}
              onSelectToken={setSelectedToken}
            />
          )}
        </section>

        {/* Panel Admin (hanya untuk alamat tertentu) */}
        {connectedWallet === process.env.REACT_APP_ADMIN_ADDRESS && (
          <AdminPanel 
            onAddToken={adminFunctions.addToken}
            onUpdateToken={adminFunctions.updateToken}
            onUpdateFees={adminFunctions.updateFees}
            onCreateLaunchpad={adminFunctions.createLaunchpad}
            currentFees={tradeSettings.fees}
          />
        )}
      </main>
    </div>
  );
};

// Komponen Pendukung
const ChainSelector = ({ selectedChain, onChange }) => {
  const [chains, setChains] = useState([]);

  useEffect(() => {
    fetch('https://chainid.network/chains.json')
      .then(res => res.json())
      .then(data => setChains(data));
  }, []);

  return (
    <select 
      value={selectedChain}
      onChange={(e) => onChange(e.target.value)}
      className="chain-selector"
    >
      <option value="all">All Chains</option>
      {chains.map(chain => (
        <option key={chain.chainId} value={chain.chainId}>
          {chain.name}
        </option>
      ))}
    </select>
  );
};

const WalletConnect = ({ connectedWallet, onConnect }) => {
  const connect = async (walletType) => {
    if (walletType === 'metamask') {
      const provider = await detectEthereumProvider();
      if (provider) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        onConnect(accounts[0]);
      }
    }
    // Tambahkan wallet lain di sini
  };

  return connectedWallet ? (
    <div className="connected-wallet">
      {`${connectedWallet.slice(0, 6)}...${connectedWallet.slice(-4)}`}
    </div>
  ) : (
    <button onClick={() => connect('metamask')} className="connect-button">
      Connect Wallet
    </button>
  );
};

const TokenCategoryTabs = ({ activeTab, onChange }) => {
  const categories = [
    'trending', 'new', 'gainer', 'loser', 
    'verified', 'volume', 'aipick', 'whale', 
    'meme', 'game'
  ];

  return (
    <div className="category-tabs">
      {categories.map(category => (
        <button
          key={category}
          className={activeTab === category ? 'active' : ''}
          onClick={() => onChange(category)}
        >
          {category.toUpperCase()}
        </button>
      ))}
    </div>
  );
};

const TokenList = ({ tokens, onSelect, category }) => {
  // Filter tambahan berdasarkan kategori
  const filtered = tokens.filter(token => {
    switch(category) {
      case 'trending': return token.isTrending;
      case 'new': return token.isNew;
      case 'gainer': return token.change24h > 0;
      case 'loser': return token.change24h < 0;
      case 'verified': return token.isVerified;
      case 'volume': return token.volume24h > 1000000;
      case 'aipick': return token.isAIPick;
      case 'whale': return token.isWhaleWatch;
      case 'meme': return token.isMeme;
      case 'game': return token.isGame;
      default: return true;
    }
  });

  return (
    <div className="token-list">
      {filtered.map(token => (
        <div 
          key={token.id}
          className="token-item"
          onClick={() => onSelect(token)}
        >
          <img src={token.logo} alt={token.symbol} className="token-logo" />
          <div className="token-info">
            <span className="symbol">{token.symbol}</span>
            <span className="price">${token.price?.toFixed(2) || '--'}</span>
            <span className={`change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
              {token.change24h?.toFixed(2) || '0.00'}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

const TokenTradingView = ({ token, fees, slippage }) => {
  const [amount, setAmount] = useState('');
  const [tradeType, setTradeType] = useState('buy');

  const calculateFee = () => {
    const value = parseFloat(amount) || 0;
    return (value * fees.swap).toFixed(4);
  };

  return (
    <div className="token-trading-view">
      <div className="token-header">
        <img src={token.logo} alt={token.symbol} className="token-logo-large" />
        <h2>{token.name} ({token.symbol})</h2>
        <div className="token-price">${token.price?.toFixed(4)}</div>
        <div className={`price-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
          {token.change24h?.toFixed(2)}% (24h)
        </div>
      </div>

      <div className="trading-panel">
        <div className="trade-type-selector">
          <button 
            className={tradeType === 'buy' ? 'active' : ''}
            onClick={() => setTradeType('buy')}
          >
            Buy
          </button>
          <button 
            className={tradeType === 'sell' ? 'active' : ''}
            onClick={() => setTradeType('sell')}
          >
            Sell
          </button>
        </div>

        <div className="trade-form">
          <label>Amount ({token.symbol})</label>
          <input 
            type="number" 
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
          />

          <div className="trade-details">
            <div className="detail-row">
              <span>Price:</span>
              <span>${token.price?.toFixed(4)}</span>
            </div>
            <div className="detail-row">
              <span>Slippage:</span>
              <span>{slippage}%</span>
            </div>
            <div className="detail-row">
              <span>Fee:</span>
              <span>{calculateFee()} {token.symbol}</span>
            </div>
          </div>

          <button className={`trade-button ${tradeType}`}>
            {tradeType === 'buy' ? 'Buy' : 'Sell'} {token.symbol}
          </button>
        </div>
      </div>

      <div className="token-metrics">
        <div className="metric-card">
          <h3>Risk Assessment</h3>
          <div className="risk-score">{token.riskScore || 'N/A'}/10</div>
          <p>{token.riskFactors || 'No risk data available'}</p>
        </div>

        <div className="metric-card">
          <h3>Liquidity</h3>
          <div className={`liquidity-status ${token.liquidityLocked ? 'locked' : 'unlocked'}`}>
            {token.liquidityLocked ? 'LOCKED' : 'UNLOCKED'}
          </div>
          {token.liquidityLocked && (
            <p>Locked until: {new Date(token.lockEndTime).toLocaleDateString()}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminPanel = ({ onAddToken, onUpdateToken, onUpdateFees, onCreateLaunchpad, currentFees }) => {
  const [activeTab, setActiveTab] = useState('tokens');
  const [newToken, setNewToken] = useState({
    name: '',
    symbol: '',
    chain: '1',
    contractAddress: '',
    logo: '',
    isTrending: false,
    isNew: true,
    isVerified: false
  });

  const [feeSettings, setFeeSettings] = useState(currentFees);

  const handleAddToken = () => {
    onAddToken(newToken).then(() => {
      setNewToken({
        name: '',
        symbol: '',
        chain: '1',
        contractAddress: '',
        logo: '',
        isTrending: false,
        isNew: true,
        isVerified: false
      });
    });
  };

  const handleUpdateFees = () => {
    onUpdateFees(feeSettings);
  };

  return (
    <div className="admin-panel">
      <div className="admin-tabs">
        <button 
          className={activeTab === 'tokens' ? 'active' : ''}
          onClick={() => setActiveTab('tokens')}
        >
          Token Management
        </button>
        <button 
          className={activeTab === 'fees' ? 'active' : ''}
          onClick={() => setActiveTab('fees')}
        >
          Fee Settings
        </button>
        <button 
          className={activeTab === 'launchpad' ? 'active' : ''}
          onClick={() => setActiveTab('launchpad')}
        >
          Launchpad
        </button>
      </div>

      {activeTab === 'tokens' && (
        <div className="token-management">
          <h3>Add New Token</h3>
          <div className="form-group">
            <label>Token Name</label>
            <input 
              type="text" 
              value={newToken.name}
              onChange={(e) => setNewToken({...newToken, name: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Symbol</label>
            <input 
              type="text" 
              value={newToken.symbol}
              onChange={(e) => setNewToken({...newToken, symbol: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Chain</label>
            <select
              value={newToken.chain}
              onChange={(e) => setNewToken({...newToken, chain: e.target.value})}
            >
              <option value="1">Ethereum</option>
              <option value="56">Binance Smart Chain</option>
              <option value="137">Polygon</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Contract Address</label>
            <input 
              type="text" 
              value={newToken.contractAddress}
              onChange={(e) => setNewToken({...newToken, contractAddress: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label>Logo URL</label>
            <input 
              type="text" 
              value={newToken.logo}
              onChange={(e) => setNewToken({...newToken, logo: e.target.value})}
            />
          </div>
          
          <div className="form-checkboxes">
            <label>
              <input 
                type="checkbox" 
                checked={newToken.isTrending}
                onChange={(e) => setNewToken({...newToken, isTrending: e.target.checked})}
              />
              Trending
            </label>
            
            <label>
              <input 
                type="checkbox" 
                checked={newToken.isNew}
                onChange={(e) => setNewToken({...newToken, isNew: e.target.checked})}
              />
              New Token
            </label>
            
            <label>
              <input 
                type="checkbox" 
                checked={newToken.isVerified}
                onChange={(e) => setNewToken({...newToken, isVerified: e.target.checked})}
              />
              Verified
            </label>
          </div>
          
          <button onClick={handleAddToken} className="admin-button">
            Add Token
          </button>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="fee-settings">
          <h3>Update Fee Structure</h3>
          
          <div className="form-group">
            <label>Swap Fee (%)</label>
            <input 
              type="number" 
              value={feeSettings.swap * 100}
              onChange={(e) => setFeeSettings({
                ...feeSettings,
                swap: parseFloat(e.target.value) / 100
              })}
              step="0.01"
            />
          </div>
          
          <div className="form-group">
            <label>Token Creation Fee (ETH)</label>
            <input 
              type="number" 
              value={feeSettings.createToken}
              onChange={(e) => setFeeSettings({
                ...feeSettings,
                createToken: parseFloat(e.target.value)
              })}
              step="0.1"
            />
          </div>
          
          <div className="form-group">
            <label>Listing Fee (ETH)</label>
            <input 
              type="number" 
              value={feeSettings.listing}
              onChange={(e) => setFeeSettings({
                ...feeSettings,
                listing: parseFloat(e.target.value)
              })}
              step="0.1"
            />
          </div>
          
          <button onClick={handleUpdateFees} className="admin-button">
            Update Fees
          </button>
        </div>
      )}

      {activeTab === 'launchpad' && (
        <div className="launchpad-management">
          <h3>Create Launchpad Project</h3>
          {/* Form untuk launchpad bisa ditambahkan di sini */}
        </div>
      )}
    </div>
  );
};

const MarketOverview = ({ goldPrice, onSelectToken }) => {
  return (
    <div className="market-overview">
      <div className="gold-price-card">
        <h3>Gold Price</h3>
        <div className="price">${goldPrice.toFixed(2)}</div>
        <button 
          className="trade-button"
          onClick={() => onSelectToken({
            symbol: 'XAU',
            name: 'Gold',
            price: goldPrice,
            isCommodity: true
          })}
        >
          Trade Gold
        </button>
      </div>
      
      <div className="market-stats">
        <h3>Market Statistics</h3>
        {/* Tambahkan statistik pasar di sini */}
      </div>
    </div>
  );
};

export default SPRExchange;
