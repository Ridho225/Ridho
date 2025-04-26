// Di komponen React:
useEffect(() => {
  const handleDataUpdated = () => {
    loadData(); // Refresh data saat ada update
  };
  
  document.addEventListener('data-updated', handleDataUpdated);
  return () => {
    document.removeEventListener('data-updated', handleDataUpdated);
  };
}, [category, chain]);