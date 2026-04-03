import { useCallback, useState } from 'react';
import { fetchInteractionAnalytics } from '../services/interactionRepository';

const DEFAULT_WINDOW_HOURS = 168;
const DEFAULT_RECENT_LIMIT = 25;

export default function useAdminAnalytics() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [adminAccessCode, setAdminAccessCode] = useState('');

  const loadAnalytics = useCallback(
    async (accessCode, options = {}) => {
      const normalizedCode = accessCode?.trim();

      if (!normalizedCode) {
        setErrorMessage('Enter the admin access code.');
        return false;
      }

      setIsLoading(true);
      setErrorMessage('');

      try {
        const nextAnalytics = await fetchInteractionAnalytics({
          adminAccessCode: normalizedCode,
          windowHours: options.windowHours ?? DEFAULT_WINDOW_HOURS,
          recentLimit: options.recentLimit ?? DEFAULT_RECENT_LIMIT,
        });

        setAnalytics(nextAnalytics);
        setAdminAccessCode(normalizedCode);
        return true;
      } catch (error) {
        setErrorMessage(error.message || 'Failed to load admin analytics.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const refreshAnalytics = useCallback(
    async (options = {}) => {
      if (!adminAccessCode) {
        setErrorMessage('Admin access has not been unlocked for this session.');
        return false;
      }

      return loadAnalytics(adminAccessCode, options);
    },
    [adminAccessCode, loadAnalytics],
  );

  const clearAdminSession = useCallback(() => {
    setAdminAccessCode('');
    setAnalytics(null);
    setErrorMessage('');
  }, []);

  return {
    analytics,
    isLoading,
    errorMessage,
    hasAdminAccess: Boolean(adminAccessCode),
    loadAnalytics,
    refreshAnalytics,
    clearAdminSession,
  };
}
