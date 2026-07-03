import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SQLiteProvider } from 'expo-sqlite';
import { initializeDatabase } from './schema';

interface DatabaseProviderProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches SQLiteProvider initialization failures and renders
 * a non-fatal fallback UI instead of crashing the entire application.
 */
class DatabaseErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry: () => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[DatabaseErrorBoundary] SQLite initialization failed:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.container}>
          {this.props.children}
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * Context provider wrapper mounting the underlying SQLite database instance and running initial schema migrations.
 * Wrapped in an error boundary so that DB initialization failures degrade gracefully instead of crashing the app.
 */
export function DatabaseProvider({ children }: DatabaseProviderProps) {
  const [retryKey, setRetryKey] = React.useState(0);

  return (
    <DatabaseErrorBoundary onRetry={() => setRetryKey(k => k + 1)}>
      <SQLiteProvider 
        key={retryKey}
        databaseName="hypermusic.db" 
        onInit={initializeDatabase}
        useSuspense={false}
      >
        {children}
      </SQLiteProvider>
    </DatabaseErrorBoundary>
  );
}

const boundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
