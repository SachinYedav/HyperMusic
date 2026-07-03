/**
 * Global utility for robust network request error parsing and standard variant mapping.
 */
export function parseNetworkError(error: any): {
  variant: 'offline' | 'timeout' | 'server_error' | 'empty';
  title: string;
  subtitle: string;
} {
  if (!error) {
    return {
      variant: 'server_error',
      title: 'Unexpected Error',
      subtitle: 'We encountered an unexpected issue loading this content.',
    };
  }

  const msg = error?.message || error?.toString() || '';

  // 1. Offline / Connection Loss / DNS Failure
  if (
    msg.includes('UnknownHostException') ||
    msg.includes('Connection reset') ||
    msg.includes('Unable to download a file') ||
    msg.includes('Network request failed') ||
    msg.includes('No internet') ||
    msg.includes('offline')
  ) {
    return {
      variant: 'offline',
      title: "You're Offline",
      subtitle: 'Please check your internet connection and try again.',
    };
  }

  // 2. Timeout
  if (msg.includes('SocketTimeoutException') || msg.includes('timeout')) {
    return {
      variant: 'timeout',
      title: 'Connection Timed Out',
      subtitle: 'The server took too long to respond. Please try again.',
    };
  }

  // 3. Rate Limit / Quota
  if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('403') || msg.includes('Forbidden')) {
    return {
      variant: 'server_error',
      title: 'Server Busy',
      subtitle: 'Too many requests are being processed right now. Please try again in a moment.',
    };
  }

  // 4. Extraction / Generic Server Fault
  return {
    variant: 'server_error',
    title: 'Content Unavailable',
    subtitle: 'We encountered an unexpected issue loading this content.',
  };
}
