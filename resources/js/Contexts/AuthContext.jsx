import React, { createContext, useState, useContext, useEffect } from 'react';
import { checkAuthState } from '../utils/apiClient';
export const AuthContext = createContext(null);
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState(null);
    useEffect(() => {
        const initializeAuth = async () => {
            try {
                const isAuthed = await checkAuthState();
                setIsAuthenticated(isAuthed);
            } catch (error) {
                setIsAuthenticated(false);
            } finally {
                setIsLoading(false);
            }
        };
        initializeAuth();
    }, []);
    const login = (userData, token) => {
        localStorage.setItem('token', token);
        setUser(userData);
        setIsAuthenticated(true);
    };
    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setIsAuthenticated(false);
    };
    if (isLoading) {
        return <div>Loading...</div>;
    }
    return (
        <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};