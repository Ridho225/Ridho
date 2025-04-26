getTokensByCategory(category, chain = 'all') {
  return this.allTokens
    .filter(token => 
      (chain === 'all' || token.chain === chain) &&
      token.addedByAdmin &&
      this.categoryFilters[category](token)
    )
    .sort(this.getSortFunction(category));
}