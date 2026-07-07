import { useState, useCallback } from 'react';

/**
 * Hook for managing loading state
 */
export default function useLoading(initialState = false) {
    const [loading, setLoading] = useState(initialState);
    const [error, setError] = useState(null);

    const startLoading = useCallback(() => {
        setLoading(true);
        setError(null);
    }, []);

    const stopLoading = useCallback(() => {
        setLoading(false);
    }, []);

    const setErrorState = useCallback((error) => {
        setError(error);
        setLoading(false);
    }, []);

    const execute = useCallback(async (asyncFunction) => {
        try {
            startLoading();
            const result = await asyncFunction();
            stopLoading();
            return result;
        } catch (err) {
            setErrorState(err);
            throw err;
        }
    }, [startLoading, stopLoading, setErrorState]);

    return {
        loading,
        error,
        startLoading,
        stopLoading,
        setError: setErrorState,
        execute,
    };
}



