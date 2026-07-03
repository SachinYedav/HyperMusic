export interface HighlightedSearchPart {
  text: string;
  isMatch: boolean;
}

export function getHighlightedSearchParts(label: string, query: string): HighlightedSearchPart[] {
  const needle = query.trim();
  if (!needle) return [{ text: label, isMatch: false }];

  const normalizedLabel = label.toLowerCase();
  const normalizedNeedle = needle.toLowerCase();
  const parts: HighlightedSearchPart[] = [];
  let cursor = 0;

  while (cursor < label.length) {
    const matchIndex = normalizedLabel.indexOf(normalizedNeedle, cursor);
    if (matchIndex === -1) {
      parts.push({ text: label.slice(cursor), isMatch: false });
      break;
    }

    if (matchIndex > cursor) {
      parts.push({ text: label.slice(cursor, matchIndex), isMatch: false });
    }

    parts.push({
      text: label.slice(matchIndex, matchIndex + needle.length),
      isMatch: true,
    });
    cursor = matchIndex + needle.length;
  }

  return parts.filter((part) => part.text.length > 0);
}
