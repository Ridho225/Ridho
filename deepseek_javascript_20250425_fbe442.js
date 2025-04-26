async updateTokenListing(tokenId, updates) {
  // Kirim update ke API
  const response = await this.fetchAPI(`admin/tokens/${tokenId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  
  // Update local cache
  if (response.success) {
    const tokenIndex = this.allTokens.findIndex(t => t.id === tokenId);
    if (tokenIndex !== -1) {
      this.allTokens[tokenIndex] = {
        ...this.allTokens[tokenIndex],
        ...updates
      };
    }
  }
  return response;
}