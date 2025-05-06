import React, { Component } from 'react';

/**
 * Error Boundary component to catch JavaScript errors in child components
 * and display a fallback UI instead of crashing the whole app
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { 
            hasError: false,
            error: null,
            errorInfo: null
        };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to the console
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
        
        // You can also log the error to an error reporting service
        // logErrorToService(error, errorInfo);
    }

    render() {
        const { hasError, error, errorInfo } = this.state;
        const { fallback, children } = this.props;

        if (hasError) {
            // You can render any custom fallback UI
            if (fallback) {
                return fallback(error, errorInfo);
            }

            return (
                <div className="p-4 border border-red-300 rounded bg-red-50 text-red-800">
                    <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
                    <details className="whitespace-pre-wrap text-sm">
                        <summary>Show error details</summary>
                        <p className="mt-2">{error && error.toString()}</p>
                        <p className="mt-2 text-xs text-gray-700">
                            {errorInfo && errorInfo.componentStack}
                        </p>
                    </details>
                </div>
            );
        }

        // If there's no error, render children normally
        return children;
    }
}

/**
 * Higher-order component to wrap a component with an ErrorBoundary
 * @param {React.Component} Component - The component to wrap
 * @param {Function} fallback - Optional custom fallback UI renderer
 * @returns {React.Component} - The wrapped component
 */
export const withErrorBoundary = (Component, fallback) => {
    return function WithErrorBoundary(props) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
};

export default ErrorBoundary;
