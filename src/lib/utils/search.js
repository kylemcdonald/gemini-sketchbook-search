export function highlightMatches(text, searchTerm) {
  if (!searchTerm) return text;
  
  const regex = new RegExp(searchTerm, 'gi');
  return text.replace(regex, match => `<mark>${match}</mark>`);
} 