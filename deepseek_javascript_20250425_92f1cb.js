// SPR Exchange Token Filtering System
const SPRTokenManager = {
  // Data struktur untuk semua token
  allTokens: [],
  
  // Inisialisasi dengan data contoh
  init: function() {
    // Contoh data token (dalam implementasi nyata, ini akan diambil dari API/database)
    this.allTokens = [
      {
        id: 'eth-1',
        name: 'Ethereum',
        symbol: 'ETH',
        logo: '/tokens/eth.svg',
        chain: 'ethereum',
        price: 3500,
        change24h: 2.5,
        volume24h: 1500000000,
        marketCap: 420000000000,
        isTrending: true,
        isNew: false,
        isGainer: true,
        isVerified: true,
        isAIPick: false,
        isWhaleWatch: true,
        isMeme: false,
        addedByAdmin: true
      },
      {
        id: 'bsc-1',
        name: 'Binance Coin',
        symbol: 'BNB',
        logo: '/tokens/bnb.svg',
        chain: 'binance',
        price: 400,
        change24h: -1.2,
        volume24h: 800000000,
        marketCap: 65000000000,
        isTrending: true,
        isNew: true,
        isGainer: false,
        isVerified: true,
        isAIPick: true,
        isWhaleWatch: false,
        isMeme: false,
        addedByAdmin: true
      },
      // Tambahkan lebih banyak token contoh...
    ];
    
    console.log('Token manager initialized with', this.allTokens.length, 'tokens');
  },
  
  // Fungsi untuk admin menambahkan token baru
  addToken: function(tokenData) {
    // Validasi data token
    if (!tokenData.symbol || !tokenData.chain) {
      console.error('Token data tidak valid');
      return false;
    }
    
    // Set flag bahwa token ditambahkan oleh admin
    tokenData.addedByAdmin = true;
    
    // Generate ID unik
    tokenData.id = `${tokenData.chain}-${Date.now()}`;
    
    // Tambahkan ke daftar
    this.allTokens.push(tokenData);
    
    console.log(`Token ${tokenData.symbol} ditambahkan ke jaringan ${tokenData.chain}`);
    return tokenData.id;
  },
  
  // Fungsi untuk mendapatkan token berdasarkan kategori dan chain
  getTokensByCategory: function(category, chain = 'all') {
    // Filter berdasarkan chain jika tidak 'all'
    let filteredTokens = chain === 'all' 
      ? this.allTokens 
      : this.allTokens.filter(token => token.chain === chain);
    
    // Filter berdasarkan kategori dan hanya yang ditambahkan admin
    filteredTokens = filteredTokens.filter(token => {
      if (!token.addedByAdmin) return false;
      
      switch(category) {
        case 'trending':
          return token.isTrending;
        case 'new':
          return token.isNew;
        case 'gainer':
          return token.isGainer && token.change24h > 0;
        case 'loser':
          return token.change24h < 0;
        case 'verified':
          return token.isVerified;
        case 'volume':
          // Token dengan volume tinggi (top 20%)
          const sortedByVolume = [...this.allTokens].sort((a, b) => b.volume24h - a.volume24h);
          const volumeThreshold = sortedByVolume[Math.floor(sortedByVolume.length * 0.2)].volume24h;
          return token.volume24h >= volumeThreshold;
        case 'aipick':
          return token.isAIPick;
        case 'whale':
          return token.isWhaleWatch;
        case 'meme':
          return token.isMeme;
        default:
          return false;
      }
    });
    
    // Urutkan berdasarkan kriteria yang relevan
    switch(category) {
      case 'gainer':
        return filteredTokens.sort((a, b) => b.change24h - a.change24h);
      case 'loser':
        return filteredTokens.sort((a, b) => a.change24h - b.change24h);
      case 'volume':
        return filteredTokens.sort((a, b) => b.volume24h - a.volume24h);
      case 'new':
        return filteredTokens.sort((a, b) => new Date(b.addedTime) - new Date(a.addedTime));
      default:
        return filteredTokens;
    }
  },
  
  // Fungsi untuk mengupdate properti token
  updateTokenProperty: function(tokenId, property, value) {
    const tokenIndex = this.allTokens.findIndex(t => t.id === tokenId);
    if (tokenIndex === -1) {
      console.error('Token tidak ditemukan');
      return false;
    }
    
    this.allTokens[tokenIndex][property] = value;
    console.log(`Token ${tokenId} properti ${property} diupdate ke ${value}`);
    return true;
  },
  
  // Fungsi untuk menandai token sebagai trending/new/gainer dll
  setTokenCategory: function(tokenId, category, value = true) {
    const validCategories = [
      'isTrending', 'isNew', 'isGainer', 'isVerified', 
      'isAIPick', 'isWhaleWatch', 'isMeme'
    ];
    
    if (!validCategories.includes(category)) {
      console.error('Kategori tidak valid');
      return false;
    }
    
    return this.updateTokenProperty(tokenId, category, value);
  }
};

// Inisialisasi
SPRTokenManager.init();

// Contoh penggunaan:

// 1. Admin menambahkan token baru
const newTokenId = SPRTokenManager.addToken({
  name: 'Solana',
  symbol: 'SOL',
  chain: 'solana',
  logo: '/tokens/sol.svg',
  price: 120,
  change24h: 5.8,
  isNew: true,
  isGainer: true
});

// 2. Set token sebagai trending
SPRTokenManager.setTokenCategory(newTokenId, 'isTrending');

// 3. Mengambil token trending semua jaringan
const trendingTokens = SPRTokenManager.getTokensByCategory('trending');
console.log('Trending tokens (all chains):', trendingTokens);

// 4. Mengambil token baru di jaringan tertentu
const newTokensOnBinance = SPRTokenManager.getTokensByCategory('new', 'binance');
console.log('New tokens on Binance:', newTokensOnBinance);

// 5. Mengambil token gainer di Ethereum
const gainerTokensOnEth = SPRTokenManager.getTokensByCategory('gainer', 'ethereum');
console.log('Gainer tokens on Ethereum:', gainerTokensOnEth);

// 6. Mengambil token dengan volume tinggi di Solana
const volumeTokensOnSolana = SPRTokenManager.getTokensByCategory('volume', 'solana');
console.log('High volume tokens on Solana:', volumeTokensOnSolana);

// Ekspor untuk digunakan di modul lain
export default SPRTokenManager;