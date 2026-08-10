export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  isExtracted?: boolean;
  extractedAt?: number; 
  trackType?: string;
}
