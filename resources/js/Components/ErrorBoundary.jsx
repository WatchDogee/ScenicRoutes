import React, { Component } from 'react';
$1
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
        
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        
        this.setState({ errorInfo });
        
        
    }
    render() {
        const { hasError, error, errorInfo } = this.state;
        const { fallback, children } = this.props;
        if (hasError) {
            
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
        
        return children;
    }
}
$1
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
