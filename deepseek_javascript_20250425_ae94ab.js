// SPR Exchange Real-Time System
class SPRExchange {
  constructor() {
    this.apiBaseUrl = "https://api.spr-exchange.com/v1";
    this.socket = null;
    this.allTokens = [];
    this.cache = {
      tokens: {},
      prices: {},
      lastUpdated: null
    };
    
    // Inisialisasi
    this.init();
  }

  async init() {
    await this.loadInitialData();
    this.connectWebSocket();
    this.setupAutoRefresh();
  }

  // 1. API MANAGEMENT SYSTEM
  async fetchAPI(endpoint, params = {}) {
    const url = new URL(`${this.apiBaseUrl}/${endpoint}`);
    Object.keys(params).forEach(key => 
      url.searchParams.append(key, params[key]));
    
    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.adminApiKey}`
        }
      });
      
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      this.fallbackToBackupAPI(endpoint);
    }
  }

  async fallbackToBackupAPI(endpoint) {
    console.log("Switching to backup API...");
    const backupResponse = await fetch(`https://backup-api.spr-exchange.com/${endpoint}`);
    return backupResponse.json();
  }

  // 2. REAL-TIME DATA SYSTEM
  async loadInitialData() {
    const [tokens, prices] = await Promise.all([
      this.fetchAPI('tokens'),
      this.fetchAPI('prices/latest')
    ]);
    
    this.allTokens = tokens.map(token => ({
      ...token,
      price: prices[token.id]?.price || token.price,
      lastUpdated: new Date()
    }));
    
    this.cache.lastUpdated = new Date();
    console.log(`Loaded ${this.allTokens.length} tokens`);
  }

  connectWebSocket() {
    this.socket = new WebSocket("wss://api.spr-exchange.com/realtime");
    
    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // Update harga token real-time
      if (data.type === 'price_update') {
        this.updateTokenPrices(data.payload);
      }
      
      // Token baru ditambahkan
      if (data.type === 'new_token') {
        this.addNewToken(data.payload);
      }
    };
    
    this.socket.onclose = () => {
      console.log("WebSocket disconnected, reconnecting...");
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  updateTokenPrices(priceUpdates) {
    priceUpdates.forEach(update => {
      const tokenIndex = this.allTokens.findIndex(t => t.id === update.tokenId);
      if (tokenIndex !== -1) {
        this.allTokens[tokenIndex].price = update.price;
        this.allTokens[tokenIndex].change24h = update.change24h;
        this.allTokens[tokenIndex].volume24h = update.volume24h;
        this.allTokens[tokenIndex].lastUpdated = new Date();
      }
    });
    
    // Trigger UI update
    this.dispatchEvent(new CustomEvent('data-updated'));
  }

  addNewToken(tokenData) {
    // Pastikan token belum ada
    if (!this.allTokens.some(t => t.id === tokenData.id)) {
      tokenData.addedByAdmin = true;
      tokenData.isNew = true;
      tokenData.addedTime = new Date();
      this.allTokens.unshift(tokenData); // Tambahkan di awal array
      console.log("New token added:", tokenData.symbol);
    }
  }

  // 3. ADMIN CONTROL SYSTEM
  setApiKey(apiKey) {
    this.adminApiKey = apiKey;
    console.log("API key set for admin operations");
  }

  async addToken(tokenData) {
    // Validasi data token
    const requiredFields = ['name', 'symbol', 'chain', 'contractAddress'];
    if (!requiredFields.every(field => tokenData[field])) {
      throw new Error("Missing required token fields");
    }
    
    // Kirim ke API
    const response = await this.fetchAPI('admin/tokens', {
      method: 'POST',
      body: JSON.stringify(tokenData)
    });
    
    // Tambahkan ke local cache
    if (response.success) {
      this.addNewToken(response.token);
    }
    
    return response;
  }

  async updateTokenListing(tokenId, updates) {
    const response = await this.fetchAPI(`admin/tokens/${tokenId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
    
    if (response.success) {
      const tokenIndex = this.allTokens.findIndex(t => t.id === tokenId);
      if (tokenIndex !== -1) {
        this.allTokens[tokenIndex] = {
          ...this.allTokens[tokenIndex],
          ...updates,
          lastUpdated: new Date()
        };
      }
    }
    
    return response;
  }

  // 4. TOKEN FILTERING SYSTEM
  getNewTokens(chain = 'all') {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    return this.allTokens
      .filter(token => {
        // Filter berdasarkan chain
        if (chain !== 'all' && token.chain !== chain) return false;
        
        // Hanya token yang ditambahkan admin
        if (!token.addedByAdmin) return false;
        
        // Token baru (ditambahkan dalam 1 minggu terakhir)
        return new Date(token.addedTime) > oneWeekAgo;
      })
      .sort((a, b) => new Date(b.addedTime) - new Date(a.addedTime));
  }

  getTokensByCategory(category, chain = 'all') {
    const filterFunctions = {
      trending: token => token.isTrending,
      new: token => this.getNewTokens().includes(token),
      gainer: token => token.change24h > 0,
      loser: token => token.change24h < 0,
      verified: token => token.isVerified,
      volume: token => token.volume24h > 1000000, // > $1M volume
      aipick: token => token.isAIPick,
      whale: token => token.isWhaleWatch,
      meme: token => token.isMeme
    };
    
    return this.allTokens
      .filter(token => {
        // Filter dasar
        if (chain !== 'all' && token.chain !== chain) return false;
        if (!token.addedByAdmin) return false;
        
        // Terapkan filter kategori
        return filterFunctions[category](token);
      })
      .sort(this.getSortFunction(category));
  }

  getSortFunction(category) {
    const sortFunctions = {
      trending: (a, b) => b.volume24h - a.volume24h,
      new: (a, b) => new Date(b.addedTime) - new Date(a.addedTime),
      gainer: (a, b) => b.change24h - a.change24h,
      loser: (a, b) => a.change24h - b.change24h,
      volume: (a, b) => b.volume24h - a.volume24h,
      default: (a, b) => b.marketCap - a.marketCap
    };
    
    return sortFunctions[category] || sortFunctions.default;
  }

  // 5. AUTO REFRESH SYSTEM
  setupAutoRefresh() {
    // Refresh data setiap 5 menit
    setInterval(async () => {
      console.log("Auto-refreshing token data...");
      await this.loadInitialData();
    }, 5 * 60 * 1000);
    
    // Cleanup WebSocket setiap jam
    setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
    }, 60 * 60 * 1000);
  }
}

// 6. REACT COMPONENT INTEGRATION
const TokenListComponent = ({ category, chain }) => {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const exchange = new SPRExchange();
    
    // Load initial data
    const loadData = () => {
      setIsLoading(true);
      let filteredTokens;
      
      if (category === 'new') {
        filteredTokens = exchange.getNewTokens(chain);
      } else {
        filteredTokens = exchange.getTokensByCategory(category, chain);
      }
      
      setTokens(filteredTokens);
      setLastUpdated(new Date());
      setIsLoading(false);
    };
    
    loadData();
    
    // Subscribe to real-time updates
    const handleDataUpdated = () => {
      console.log("Received real-time update");
      loadData();
    };
    
    document.addEventListener('data-updated', handleDataUpdated);
    
    return () => {
      document.removeEventListener('data-updated', handleDataUpdated);
    };
  }, [category, chain]);

  return (
    <div className="token-list">
      <div className="list-header">
        <h2>{category.toUpperCase()} TOKENS {chain !== 'all' ? `ON ${chain.toUpperCase()}` : ''}</h2>
        {lastUpdated && (
          <span className="last-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
      
      {isLoading ? (
        <div className="loading-spinner"></div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Token</th>
              <th>Price</th>
              <th>24h</th>
              <th>Volume</th>
              <th>Chain</th>
            </tr>
          </thead>
          <tbody>
            {tokens.map(token => (
              <TokenRow key={token.id} token={token} />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

const TokenRow = ({ token }) => (
  <tr>
    <td className="token-info">
      <img src={token.logo} alt={token.symbol} />
      <div>
        <div className="token-name">{token.name}</div>
        <div className="token-symbol">{token.symbol}</div>
      </div>
    </td>
    <td>${token.price?.toFixed(4) || 'N/A'}</td>
    <td className={token.change24h >= 0 ? 'positive' : 'negative'}>
      {token.change24h?.toFixed(2) || 0}%
    </td>
    <td>${(token.volume24h / 1000000).toFixed(2)}M</td>
    <td>
      <span className={`chain-badge ${token.chain}`}>
        {token.chain}
      </span>
    </td>
  </tr>
);

// 7. ADMIN DASHBOARD COMPONENT
const AdminDashboard = () => {
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    chain: 'ethereum',
    contractAddress: '',
    isTrending: false,
    isNew: true,
    isVerified: false
  });
  
  const handleAddToken = async () => {
    const exchange = new SPRExchange();
    try {
      const response = await exchange.addToken(formData);
      if (response.success) {
        alert('Token added successfully!');
        setFormData({
          name: '',
          symbol: '',
          chain: 'ethereum',
          contractAddress: '',
          isTrending: false,
          isNew: true,
          isVerified: false
        });
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };
  
  return (
    <div className="admin-panel">
      <h2>ADD NEW TOKEN</h2>
      <div className="form-group">
        <label>Token Name</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>Symbol</label>
        <input 
          type="text" 
          value={formData.symbol}
          onChange={(e) => setFormData({...formData, symbol: e.target.value})}
        />
      </div>
      
      <div className="form-group">
        <label>Blockchain</label>
        <select
          value={formData.chain}
          onChange={(e) => setFormData({...formData, chain: e.target.value})}
        >
          <option value="ethereum">Ethereum</option>
          <option value="binance">Binance Smart Chain</option>
          <option value="solana">Solana</option>
          {/* Tambahkan chain lainnya */}
        </select>
      </div>
      
      <div className="form-group">
        <label>Contract Address</label>
        <input 
          type="text" 
          value={formData.contractAddress}
          onChange={(e) => setFormData({...formData, contractAddress: e.target.value})}
        />
      </div>
      
      <div className="form-checkboxes">
        <label>
          <input 
            type="checkbox" 
            checked={formData.isTrending}
            onChange={(e) => setFormData({...formData, isTrending: e.target.checked})}
          />
          Trending
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={formData.isNew}
            onChange={(e) => setFormData({...formData, isNew: e.target.checked})}
          />
          New Token
        </label>
        
        <label>
          <input 
            type="checkbox" 
            checked={formData.isVerified}
            onChange={(e) => setFormData({...formData, isVerified: e.target.checked})}
          />
          Verified
        </label>
      </div>
      
      <button onClick={handleAddToken} className="submit-button">
        Add Token
      </button>
    </div>
  );
};

// 8. CHAIN FILTER COMPONENT
const ChainFilter = ({ currentChain, onChange }) => {
  const chains = [
    { id: 'all', name: 'All Chains' },
    { id: 'ethereum', name: 'Ethereum' },
    { id: 'binance', name: 'Binance' },
    { id: 'solana', name: 'Solana' },
    { id: 'polygon', name: 'Polygon' },
    { id: 'avalanche', name: 'Avalanche' }
  ];
  
  return (
    <div className="chain-filter">
      {chains.map(chain => (
        <button
          key={chain.id}
          className={currentChain === chain.id ? 'active' : ''}
          onClick={() => onChange(chain.id)}
        >
          {chain.name}
        </button>
      ))}
    </div>
  );
};

// 9. MAIN APP COMPONENT
const App = () => {
  const [activeCategory, setActiveCategory] = useState('new');
  const [selectedChain, setSelectedChain] = useState('all');
  
  const categories = [
    'trending', 'new', 'gainer', 'loser',
    'verified', 'volume', 'aipick', 'whale', 'meme'
  ];
  
  return (
    <div className="spr-exchange-app">
      <header>
        <h1>SPR Exchange</h1>
        <ChainFilter 
          currentChain={selectedChain}
          onChange={setSelectedChain}
        />
      </header>
      
      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category}
            className={activeCategory === category ? 'active' : ''}
            onClick={() => setActiveCategory(category)}
          >
            {category.toUpperCase()}
          </button>
        ))}
      </div>
      
      <TokenListComponent 
        category={activeCategory} 
        chain={selectedChain} 
      />
      
      {/* Admin Dashboard (hanya tampil jika admin) */}
      {user.isAdmin && <AdminDashboard />}
    </div>
  );
};

// Inisialisasi aplikasi
const exchange = new SPRExchange();
exchange.setApiKey('YOUR_ADMIN_API_KEY');

// Render aplikasi
ReactDOM.render(<App />, document.getElementById('root'));