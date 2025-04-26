import React, { useState, useEffect, useRef } from 'react';
import { ethers } from 'ethers';
import * as d3 from 'd3';
import { Chart } from 'react-advanced-chart';
import { WalletConnectButton } from '@walletconnect/react-walletconnect';
import { detectEthereumProvider } from '@metamask/detect-provider';

// SVG Logo Component
const SPRLogo = () => (
  <svg width="120" height="40" viewBox="0 0 120 40" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4f46e5" />
        <stop offset="100%" stopColor="#06b6d4" />
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="120" height="40" rx="8" fill="url(#gradient)" />
    <path d="M20 12 L30 28 L40 12 M50 12 L50 28 L60 28 L60 12 M70 12 L80 28 L90 12" 
          stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
    <text x="105" y="28" fontFamily="Arial" fontSize="20" fill="white" textAnchor="end">EXCHANGE</text>
  </svg>
);

// Wallet Icons - Sample of 30 wallets
const walletIcons = {
  metamask: '/wallets/metamask.svg',
  trustwallet: '/wallets/trustwallet.svg',
  coinbase: '/wallets/coinbase.svg',
  // Add 27 more wallet icons...
};

// Blockchain Icons - Sample structure for 250 chains
const chainIcons = {
  ethereum: '/chains/ethereum.svg',
  binance: '/chains/binance.svg',
  polygon: '/chains/polygon.svg',
  // Add 247 more chain icons...
};

// Token data structure
const tokenData = {
  ethereum: [
    { symbol: 'ETH', name: 'Ethereum', logo: '/tokens/eth.svg', price: 3500, change24h: 2.5 },
    { symbol: 'USDT', name: 'Tether', logo: '/tokens/usdt.svg', price: 1.0, change24h: 0.1 },
    // Add more Ethereum tokens...
  ],
  binance: [
    { symbol: 'BNB', name: 'Binance Coin', logo: '/tokens/bnb.svg', price: 400, change24h: 1.2 },
    // Add more BSC tokens...
  ],
  // Add tokens for other chains...
};

const SPRExchange = () => {
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [selectedChain, setSelectedChain] = useState('all');
  const [activeTab, setActiveTab] = useState('trending');
  const [showChains, setShowChains] = useState(false);
  const [selectedToken, setSelectedToken] = useState(null);
  const [tradeType, setTradeType] = useState('spot');
  const [orderHistory, setOrderHistory] = useState([]);
  const [goldPrice, setGoldPrice] = useState(1950.50);
  
  // Connect wallet function
  const connectWallet = async (walletType) => {
    try {
      let provider;
      switch(walletType) {
        case 'metamask':
          provider = await detectEthereumProvider();
          if (provider) {
            await provider.request({ method: 'eth_requestAccounts' });
            setConnectedWallet('metamask');
          }
          break;
        // Add cases for other wallets...
        default:
          console.log('Wallet not supported');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  // Load token data for selected chain
  const filteredTokens = selectedChain === 'all' 
    ? Object.values(tokenData).flat() 
    : tokenData[selectedChain] || [];

  // Trading view component
  const TradingView = ({ token }) => (
    <div className="trading-view">
      <div className="chart-container">
        <Chart 
          symbol={`${token.symbol}USD`} 
          interval="1D" 
          theme="dark" 
          style="1" 
          locale="en" 
          toolbarBg="#1e1e2d" 
          enablePublishing={false}
          hideTopToolbar={false}
          hideSideToolbar={false}
          allowSymbolChange={true}
          saveImage={false}
          details={true}
          hotList={true}
          calendar={true}
        />
      </div>
      <div className="trading-panel">
        <div className="order-form">
          <h3>Buy/Sell {token.symbol}</h3>
          <div className="form-group">
            <label>Price (USD)</label>
            <input type="number" value={token.price} readOnly />
          </div>
          <div className="form-group">
            <label>Amount</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="form-group">
            <label>Total</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="button-group">
            <button className="buy-button">Buy {token.symbol}</button>
            <button className="sell-button">Sell {token.symbol}</button>
          </div>
        </div>
        <div className="order-book">
          <h3>Order Book</h3>
          <table>
            <thead>
              <tr>
                <th>Price (USD)</th>
                <th>Amount</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sell-price">3500.12</td>
                <td>1.25</td>
                <td>4375.15</td>
              </tr>
              {/* More order book rows... */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Token Info Component
  const TokenInfo = ({ token }) => (
    <div className="token-info">
      <div className="token-header">
        <img src={token.logo} alt={token.symbol} className="token-logo" />
        <div className="chain-logo-container">
          <img src={chainIcons[selectedChain]} alt={selectedChain} className="chain-logo" />
        </div>
        <h2>{token.name} ({token.symbol})</h2>
        <span className={`price-change ${token.change24h >= 0 ? 'positive' : 'negative'}`}>
          {token.change24h >= 0 ? '+' : ''}{token.change24h}%
        </span>
      </div>
      
      <div className="token-metrics">
        <div className="metric">
          <span className="label">Price:</span>
          <span className="value">${token.price.toLocaleString()}</span>
        </div>
        <div className="metric">
          <span className="label">Market Cap:</span>
          <span className="value">$42.5B</span>
        </div>
        <div className="metric">
          <span className="label">24h Volume:</span>
          <span className="value">$1.2B</span>
        </div>
        <div className="metric">
          <span className="label">Liquidity:</span>
          <span className="value positive">High</span>
        </div>
        <div className="metric">
          <span className="label">Risk Score:</span>
          <span className="value warning">Medium (5.2/10)</span>
        </div>
      </div>
      
      <div className="token-links">
        <a href="#" className="link-button">Contract</a>
        <a href="#" className="link-button">Website</a>
        <a href="#" className="link-button">Twitter</a>
        <a href="#" className="link-button">Telegram</a>
        <a href="#" className="link-button">Whitepaper</a>
      </div>
    </div>
  );

  // Launchpad Component
  const Launchpad = () => (
    <div className="launchpad-section">
      <h2>Token Launchpad</h2>
      <div className="launchpad-tabs">
        <button className="active">Upcoming</button>
        <button>Live</button>
        <button>Completed</button>
        <button>Create Project</button>
      </div>
      
      <div className="launchpad-projects">
        <div className="project-card">
          <div className="project-header">
            <img src="/projects/project1.png" alt="Project 1" />
            <h3>MetaVerseX</h3>
            <span className="tag">IDO</span>
          </div>
          <div className="project-details">
            <p>The next generation metaverse platform with AI integration</p>
            <div className="progress-bar">
              <div className="progress" style={{ width: '65%' }}></div>
            </div>
            <div className="project-stats">
              <div>
                <span>Hard Cap</span>
                <strong>$500,000</strong>
              </div>
              <div>
                <span>Raised</span>
                <strong>$325,000</strong>
              </div>
              <div>
                <span>Ends In</span>
                <strong>2D 4H</strong>
              </div>
            </div>
            <button className="participate-button">Participate</button>
          </div>
        </div>
        {/* More project cards... */}
      </div>
    </div>
  );

  // Futures Trading Component
  const FuturesTrading = () => (
    <div className="futures-section">
      <h2>Futures Trading</h2>
      <div className="leverage-selector">
        <span>Leverage:</span>
        <select>
          <option>1x</option>
          <option>5x</option>
          <option>10x</option>
          <option>25x</option>
          <option>50x</option>
          <option>100x</option>
        </select>
      </div>
      
      <div className="futures-chart">
        <Chart 
          symbol="BTCUSDTPERP" 
          interval="15" 
          theme="dark" 
          style="9" 
          locale="en" 
          toolbarBg="#1e1e2d"
          hideTopToolbar={false}
          hideSideToolbar={false}
        />
      </div>
      
      <div className="futures-panel">
        <div className="position-form">
          <div className="form-row">
            <label>Entry Price</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Amount</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Take Profit</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="form-row">
            <label>Stop Loss</label>
            <input type="number" placeholder="0.00" />
          </div>
          <div className="button-group">
            <button className="long-button">Long</button>
            <button className="short-button">Short</button>
          </div>
        </div>
        
        <div className="positions-list">
          <h3>Open Positions</h3>
          <table>
            <thead>
              <tr>
                <th>Pair</th>
                <th>Size</th>
                <th>Entry</th>
                <th>Mark</th>
                <th>Liq</th>
                <th>PNL</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>BTC/USDT</td>
                <td>0.5</td>
                <td>42,350.20</td>
                <td>42,580.50</td>
                <td>38,115.18</td>
                <td className="positive">+115.15</td>
                <td>
                  <button className="close-button">Close</button>
                </td>
              </tr>
              {/* More positions... */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Gold Investment Component
  const GoldInvestment = () => (
    <div className="gold-section">
      <h2>Gold Investment</h2>
      <div className="gold-price-ticker">
        <div className="gold-icon">🥇</div>
        <div className="price-info">
          <span className="label">XAU/USD</span>
          <span className="price">${goldPrice.toFixed(2)}</span>
          <span className="change positive">+12.50 (0.64%)</span>
        </div>
      </div>
      
      <div className="gold-chart">
        <Chart 
          symbol="XAUUSD" 
          interval="1D" 
          theme="dark" 
          style="1" 
          locale="en" 
          toolbarBg="#1e1e2d"
        />
      </div>
      
      <div className="gold-products">
        <div className="product-card">
          <h3>Physical Gold</h3>
          <p>Own physical gold bars stored in secure vaults</p>
          <div className="product-details">
            <span>From 1g to 1kg</span>
            <span>99.99% purity</span>
            <span>Insured storage</span>
          </div>
          <button className="invest-button">Invest Now</button>
        </div>
        
        <div className="product-card">
          <h3>Gold Tokens</h3>
          <p>Tokenized gold on blockchain</p>
          <div className="product-details">
            <span>1 token = 1g gold</span>
            <span>24/7 trading</span>
            <span>Redeemable</span>
          </div>
          <button className="invest-button">Trade Now</button>
        </div>
        
        <div className="product-card">
          <h3>Gold Futures</h3>
          <p>Trade gold price movements</p>
          <div className="product-details">
            <span>Up to 100x leverage</span>
            <span>Low spreads</span>
            <span>24/7 trading</span>
          </div>
          <button className="invest-button">Start Trading</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="spr-exchange">
      {/* Header */}
      <header className="exchange-header">
        <div className="logo-container">
          <SPRLogo />
        </div>
        
        {/* Wallet Connect Button */}
        <div className="wallet-connect">
          {connectedWallet ? (
            <div className="connected-wallet">
              <img src={walletIcons[connectedWallet]} alt={connectedWallet} />
              <span>0x1a2...3b4c</span>
              <span className="balance">$1,245.32</span>
            </div>
          ) : (
            <div className="wallet-selector">
              <button onClick={() => setShowChains(!showChains)} className="chain-selector">
                <img src={chainIcons[selectedChain] || '/chains/multichain.svg'} alt={selectedChain} />
                <span>{selectedChain === 'all' ? 'All Chains' : selectedChain}</span>
              </button>
              
              <div className="wallet-buttons">
                {Object.entries(walletIcons).slice(0, 5).map(([wallet, icon]) => (
                  <button key={wallet} onClick={() => connectWallet(wallet)} className="wallet-button">
                    <img src={icon} alt={wallet} />
                  </button>
                ))}
                <button className="more-wallets">+25</button>
              </div>
            </div>
          )}
        </div>
      </header>
      
      {/* Chain Selector Modal */}
      {showChains && (
        <div className="chain-modal">
          <div className="modal-header">
            <h3>Select Blockchain</h3>
            <button onClick={() => setShowChains(false)} className="close-button">
              &times;
            </button>
          </div>
          <div className="chain-search">
            <input type="text" placeholder="Search blockchains..." />
          </div>
          <div className="chain-grid">
            {Object.entries(chainIcons).map(([chain, icon]) => (
              <div 
                key={chain} 
                className={`chain-item ${selectedChain === chain ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedChain(chain);
                  setShowChains(false);
                }}
              >
                <img src={icon} alt={chain} />
                <span>{chain}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <main className="exchange-content">
        {/* Left Sidebar */}
        <aside className="exchange-sidebar">
          <div className="market-tabs">
            <button 
              className={activeTab === 'trending' ? 'active' : ''}
              onClick={() => setActiveTab('trending')}
            >
              Trending
            </button>
            <button 
              className={activeTab === 'new' ? 'active' : ''}
              onClick={() => setActiveTab('new')}
            >
              New
            </button>
            <button 
              className={activeTab === 'gainer' ? 'active' : ''}
              onClick={() => setActiveTab('gainer')}
            >
              Top Gainers
            </button>
            <button 
              className={activeTab === 'loser' ? 'active' : ''}
              onClick={() => setActiveTab('loser')}
            >
              Top Losers
            </button>
            <button 
              className={activeTab === 'aipick' ? 'active' : ''}
              onClick={() => setActiveTab('aipick')}
            >
              AI Picks
            </button>
            <button 
              className={activeTab === 'whale' ? 'active' : ''}
              onClick={() => setActiveTab('whale')}
            >
              Whale Watch
            </button>
            <button 
              className={activeTab === 'meme' ? 'active' : ''}
              onClick={() => setActiveTab('meme')}
            >
              Meme Trends
            </button>
          </div>
          
          <div className="token-list">
            <h3>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Tokens</h3>
            <table>
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Price</th>
                  <th>24h</th>
                </tr>
              </thead>
              <tbody>
                {filteredTokens.map((token) => (
                  <tr 
                    key={`${selectedChain}-${token.symbol}`}
                    onClick={() => setSelectedToken(token)}
                    className={selectedToken?.symbol === token.symbol ? 'selected' : ''}
                  >
                    <td>
                      <div className="token-info-cell">
                        <img src={token.logo} alt={token.symbol} className="token-logo" />
                        <div>
                          <div className="token-symbol">{token.symbol}</div>
                          <div className="token-name">{token.name}</div>
                        </div>
                      </div>
                    </td>
                    <td>${token.price.toLocaleString()}</td>
                    <td className={token.change24h >= 0 ? 'positive' : 'negative'}>
                      {token.change24h >= 0 ? '+' : ''}{token.change24h}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </aside>
        
        {/* Main Trading Area */}
        <div className="trading-main">
          {/* Navigation Tabs */}
          <div className="trading-tabs">
            <button 
              className={tradeType === 'spot' ? 'active' : ''}
              onClick={() => setTradeType('spot')}
            >
              Spot Trading
            </button>
            <button 
              className={tradeType === 'futures' ? 'active' : ''}
              onClick={() => setTradeType('futures')}
            >
              Futures
            </button>
            <button 
              className={tradeType === 'launchpad' ? 'active' : ''}
              onClick={() => setTradeType('launchpad')}
            >
              Launchpad
            </button>
            <button 
              className={tradeType === 'gold' ? 'active' : ''}
              onClick={() => setTradeType('gold')}
            >
              Gold
            </button>
            <button 
              className={tradeType === 'create' ? 'active' : ''}
              onClick={() => setTradeType('create')}
            >
              Create Token
            </button>
          </div>
          
          {/* Dynamic Content Based on Selection */}
          {tradeType === 'spot' && selectedToken ? (
            <div className="trading-container">
              <TokenInfo token={selectedToken} />
              <TradingView token={selectedToken} />
            </div>
          ) : tradeType === 'futures' ? (
            <FuturesTrading />
          ) : tradeType === 'launchpad' ? (
            <Launchpad />
          ) : tradeType === 'gold' ? (
            <GoldInvestment />
          ) : tradeType === 'create' ? (
            <div className="create-token">
              <h2>Create Your Token</h2>
              <div className="create-form">
                <div className="form-group">
                  <label>Token Name</label>
                  <input type="text" placeholder="My Awesome Token" />
                </div>
                <div className="form-group">
                  <label>Token Symbol</label>
                  <input type="text" placeholder="MAT" maxLength="10" />
                </div>
                <div className="form-group">
                  <label>Total Supply</label>
                  <input type="number" placeholder="1000000" />
                </div>
                <div className="form-group">
                  <label>Decimals</label>
                  <input type="number" placeholder="18" min="0" max="18" />
                </div>
                <div className="form-group">
                  <label>Blockchain</label>
                  <select>
                    <option>Ethereum</option>
                    <option>Binance Smart Chain</option>
                    <option>Polygon</option>
                    {/* More chains... */}
                  </select>
                </div>
                <div className="form-group">
                  <label>Token Type</label>
                  <select>
                    <option>Standard (ERC-20)</option>
                    <option>Deflationary</option>
                    <option>Reflection</option>
                    <option>Governance</option>
                  </select>
                </div>
                <button className="create-button">Create Token (0.1 ETH)</button>
              </div>
              
              <div className="advanced-options">
                <h3>Advanced Options</h3>
                <div className="options-grid">
                  <label>
                    <input type="checkbox" /> Mintable
                  </label>
                  <label>
                    <input type="checkbox" /> Burnable
                  </label>
                  <label>
                    <input type="checkbox" /> Pausable
                  </label>
                  <label>
                    <input type="checkbox" /> Ownable
                  </label>
                  <label>
                    <input type="checkbox" /> Tax/Fee
                  </label>
                  <label>
                    <input type="checkbox" /> Whitelist
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="select-token-prompt">
              <h2>Select a token to begin trading</h2>
              <p>Choose from the list on the left or search for a specific token</p>
            </div>
          )}
        </div>
        
        {/* Right Sidebar - Order History, Market Data, etc. */}
        <aside className="exchange-rightbar">
          <div className="order-history">
            <h3>Order History</h3>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Pair</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Price</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {orderHistory.map((order, index) => (
                  <tr key={index}>
                    <td>{order.date}</td>
                    <td>{order.pair}</td>
                    <td className={order.type === 'buy' ? 'positive' : 'negative'}>{order.type}</td>
                    <td>{order.amount}</td>
                    <td>{order.price}</td>
                    <td>{order.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="market-data">
            <h3>Market Overview</h3>
            <div className="data-grid">
              <div className="data-item">
                <span className="label">Total Market Cap</span>
                <span className="value">$1.25T</span>
                <span className="change positive">+2.34%</span>
              </div>
              <div className="data-item">
                <span className="label">24h Volume</span>
                <span className="value">$85.4B</span>
                <span className="change positive">+15.6%</span>
              </div>
              <div className="data-item">
                <span className="label">BTC Dominance</span>
                <span className="value">42.3%</span>
                <span className="change negative">-0.8%</span>
              </div>
              <div className="data-item">
                <span className="label">ETH Dominance</span>
                <span className="value">18.7%</span>
                <span className="change positive">+0.3%</span>
              </div>
            </div>
          </div>
          
          <div className="news-feed">
            <h3>Latest News</h3>
            <div className="news-item">
              <h4>Ethereum Merge Completed Successfully</h4>
              <p>The Ethereum network has successfully transitioned to Proof-of-Stake...</p>
              <span className="news-time">2 hours ago</span>
            </div>
            <div className="news-item">
              <h4>Binance Announces New Listing</h4>
              <p>Binance will list SPR Token in the Innovation Zone...</p>
              <span className="news-time">5 hours ago</span>
            </div>
            {/* More news items... */}
          </div>
        </aside>
      </main>
      
      {/* Footer */}
      <footer className="exchange-footer">
        <div className="footer-links">
          <div className="link-column">
            <h4>Products</h4>
            <a href="#">Spot Trading</a>
            <a href="#">Futures Trading</a>
            <a href="#">Launchpad</a>
            <a href="#">Gold Investment</a>
            <a href="#">Staking</a>
          </div>
          <div className="link-column">
            <h4>Services</h4>
            <a href="#">API Documentation</a>
            <a href="#">Institutional Services</a>
            <a href="#">OTC Trading</a>
            <a href="#">Asset Listing</a>
            <a href="#">Token Creation</a>
          </div>
          <div className="link-column">
            <h4>Support</h4>
            <a href="#">Help Center</a>
            <a href="#">Contact Us</a>
            <a href="#">Fees</a>
            <a href="#">Status</a>
            <a href="#">Community</a>
          </div>
          <div className="link-column">
            <h4>Company</h4>
            <a href="#">About Us</a>
            <a href="#">Careers</a>
            <a href="#">Blog</a>
            <a href="#">Press</a>
            <a href="#">Legal</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="copyright">
            © 2023 SPR Exchange. All rights reserved.
          </div>
          <div className="social-links">
            <a href="#"><i className="fab fa-twitter"></i></a>
            <a href="#"><i className="fab fa-telegram"></i></a>
            <a href="#"><i className="fab fa-discord"></i></a>
            <a href="#"><i className="fab fa-medium"></i></a>
            <a href="#"><i className="fab fa-github"></i></a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SPRExchange;