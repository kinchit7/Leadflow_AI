/**
 * useBackendService Hook
 * Provides authenticated backend service access with error handling
 * Resolves auth context from member and enforces tenant isolation
 */

import { useMember } from '@/integrations';
import { AuthContext, resolveAuthContext } from '@/backend/auth.web';
import { useState, useCallback } from 'react';

export interface UseBackendServiceResult {
  authContext: AuthContext | null;
  isLoading: boolean;
  error: Error | null;
  executeWithAuth: <T,>(fn: (auth: AuthContext) => Promise<T>) => Promise<T | null>;
  clearError: () => void;
}

export function useBackendService(): UseBackendServiceResult {
  const { member } = useMember();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [authContext, setAuthContext] = useState<AuthContext | null>(null);

  // Resolve auth context on member change
  const resolveAuth = useCallback(async () => {
    if (!member?._id) {
      setAuthContext(null);
      return null;
    }

    try {
      const context = await resolveAuthContext(member._id);
      setAuthContext(context);
      return context;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to resolve auth context');
      setError(error);
      setAuthContext(null);
      return null;
    }
  }, [member?._id]);

  // Execute function with auth context
  const executeWithAuth = useCallback(
    async <T,>(fn: (auth: AuthContext) => Promise<T>): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const context = authContext || (await resolveAuth());
        if (!context) {
          throw new Error('Authentication context not available');
        }

        const result = await fn(context);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Backend service error');
        setError(error);
        console.error('Backend service error:', error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [authContext, resolveAuth]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authContext,
    isLoading,
    error,
    executeWithAuth,
    clearError,
  };
}
