// Connect wallet
const handleConnect = async (walletType) => {
  const address = await SPRExchange.connectWallet(walletType);
  if (address) {
    setUserAddress(address);
  }
};

// Execute swap
const handleSwap = async () => {
  const result = await SPRExchange.handleSwap(
    fromToken, 
    toToken, 
    amount, 
    userAddress
  );
  if (result.success) {
    // Update UI
  }
};