import { SEARCH_SUGGESTION_LIMIT } from '../constants/searchConstants';
import { HyperExtractor } from 'react-native-hyper-extractor';

export async function fetchSearchSuggestions(query: string, signal?: AbortSignal) {
  const cleanQuery = query.trim().slice(0, 100).toLowerCase();
  if (cleanQuery.length < 2) return [];

  try {
    const rawSuggestions = await HyperExtractor.getSearchSuggestions(cleanQuery);
    
    // Sanitize and limit
    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const suggestion of rawSuggestions) {
      const cleanSuggestion = suggestion.trim();
      const key = cleanSuggestion.toLowerCase();
      if (!cleanSuggestion || key === cleanQuery || seen.has(key)) continue;

      seen.add(key);
      suggestions.push(cleanSuggestion);
      if (suggestions.length >= SEARCH_SUGGESTION_LIMIT) break;
    }

    return suggestions;
  } catch (error) {
    console.error("fetchSearchSuggestions error:", error);
    return [];
  }
}
