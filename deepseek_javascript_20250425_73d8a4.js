async addToken(tokenData) {
  // Validasi dan kirim ke API
  const response = await this.fetchAPI('admin/tokens', {
    method: 'POST',
    body: JSON.stringify(tokenData)
  });
  
  // Update local cache
  if (response.success) {
    this.addNewToken(response.token);
  }
  return response;
}