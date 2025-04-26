// Contoh filter untuk token baru di chain tertentu
getNewTokens(chain = 'all') {
  return this.allTokens
    .filter(token => 
      (chain === 'all' || token.chain === chain) &&
      token.addedByAdmin && 
      token.isNew &&
      new Date(token.addedTime) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    )
    .sort((a, b) => new Date(b.addedTime) - new Date(a.addedTime));
}