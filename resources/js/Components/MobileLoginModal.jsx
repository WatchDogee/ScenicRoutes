import React, { useState } from 'react';
import { FaTimes, FaUser, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa';
import apiClient from '../utils/apiClient';
import { setAuthToken } from '../utils/apiClient';
import GoogleLoginButton from './GoogleLoginButton';

export default function MobileLoginModal({ isOpen, onClose, onLogin, initialMode }) {
    const [loginForm, setLoginForm] = useState({ login: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isRegister, setIsRegister] = useState(initialMode === 'register');
    
    // Update register mode when initialMode changes
    React.useEffect(() => {
        if (initialMode === 'register') {
            setIsRegister(true);
        } else if (initialMode === 'login') {
            setIsRegister(false);
        }
    }, [initialMode]);
    
    // Listen for external events to open modal in register mode
    React.useEffect(() => {
        const handleOpenLogin = (event) => {
            if (event.detail?.mode === 'register') {
                setIsRegister(true);
            }
        };
        
        window.addEventListener('mobile-open-login', handleOpenLogin);
        return () => {
            window.removeEventListener('mobile-open-login', handleOpenLogin);
        };
    }, []);
    const [registerForm, setRegisterForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: ''
    });

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const apiUrl = `${window.location.origin}/api/login`;
            const formData = new FormData();
            formData.append('login', loginForm.login);
            formData.append('password', loginForm.password);

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.user && data.token) {
                    localStorage.setItem('token', data.token);
                    setAuthToken(data.token);
                    if (onLogin) {
                        onLogin(data.user, data.token);
                    }
                    onClose();
                    setLoginForm({ login: '', password: '' });
                } else {
                    setError(data.message || 'Login failed');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Invalid credentials');
            }
        } catch (err) {
            setError(err.message || 'Login failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const apiUrl = `${window.location.origin}/api/register`;
            const formData = new FormData();
            formData.append('name', registerForm.name);
            formData.append('email', registerForm.email);
            formData.append('password', registerForm.password);
            formData.append('password_confirmation', registerForm.password_confirmation);

            const response = await fetch(apiUrl, {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                credentials: 'same-origin'
            });

            if (response.ok) {
                const data = await response.json();
                if (data && data.user && data.token) {
                    localStorage.setItem('token', data.token);
                    setAuthToken(data.token);
                    if (onLogin) {
                        onLogin(data.user, data.token);
                    }
                    onClose();
                    setRegisterForm({ name: '', email: '', password: '', password_confirmation: '' });
                } else {
                    setError(data.message || 'Registration failed');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.message || 'Registration failed');
            }
        } catch (err) {
            setError(err.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div 
                className="mobile-drawer-overlay open"
                onClick={onClose}
            />
            <div 
                className="mobile-login-modal"
                style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    width: '100%',
                    maxWidth: '100%',
                    background: 'var(--md-surface)',
                    borderTopLeftRadius: '24px',
                    borderTopRightRadius: '24px',
                    padding: '24px',
                    paddingBottom: 'calc(24px + env(safe-area-inset-bottom))',
                    zIndex: 1300,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    boxShadow: '0px -4px 20px rgba(0,0,0,0.15)',
                    transform: 'translateY(0)',
                    animation: 'slideUp 0.3s cubic-bezier(0.2, 0, 0, 1)'
                }}
            >
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: '32px',
                    paddingBottom: '20px',
                    borderBottom: '2px solid rgba(0,0,0,0.05)'
                }}>
                    <div>
                        <h2 style={{ 
                            fontSize: '28px', 
                            fontWeight: '700', 
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text'
                        }}>
                            {isRegister ? 'Join ScenicRoutes' : 'Welcome Back!'}
                        </h2>
                        <p style={{ 
                            fontSize: '14px', 
                            color: 'var(--text-secondary)',
                            marginTop: '4px'
                        }}>
                            {isRegister ? 'Create your account to start exploring' : 'Sign in to continue your journey'}
                        </p>
                    </div>
                    <button
                        className="mobile-header-button"
                        onClick={onClose}
                        aria-label="Close"
                        style={{
                            background: 'rgba(0,0,0,0.05)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <FaTimes />
                    </button>
                </div>

                {error && (
                    <div style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                        color: '#dc2626',
                        borderRadius: '12px',
                        marginBottom: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        border: '1px solid rgba(220, 38, 38, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <span style={{ fontSize: '18px' }}>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {!isRegister ? (
                    <form onSubmit={handleLogin}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Email or Username
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaUser style={{
                                    position: 'absolute',
                                    left: '18px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--primary)',
                                    zIndex: 1
                                }} />
                                <input
                                    type="text"
                                    value={loginForm.login}
                                    onChange={(e) => setLoginForm({ ...loginForm, login: e.target.value })}
                                    className="mobile-input"
                                    placeholder="Enter your email or username"
                                    required
                                    style={{ 
                                        paddingLeft: '52px',
                                        borderColor: 'rgba(99, 102, 241, 0.2)',
                                        fontSize: '16px'
                                    }}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <FaLock style={{
                                    position: 'absolute',
                                    left: '18px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    color: 'var(--primary)',
                                    zIndex: 1
                                }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={loginForm.password}
                                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                                    className="mobile-input"
                                    placeholder="Enter your password"
                                    required
                                    style={{ 
                                        paddingLeft: '52px', 
                                        paddingRight: '52px',
                                        borderColor: 'rgba(99, 102, 241, 0.2)',
                                        fontSize: '16px'
                                    }}
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '18px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        fontSize: '18px',
                                        zIndex: 1
                                    }}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mobile-button mobile-button-primary"
                            style={{ 
                                width: '100%', 
                                marginBottom: '16px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                fontSize: '16px',
                                fontWeight: '700',
                                boxShadow: '0 8px 16px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin" style={{ display: 'inline-block', marginRight: '8px' }}>⏳</span>
                                    Signing in...
                                </>
                            ) : (
                                <>
                                    <FaUser style={{ marginRight: '8px' }} />
                                    Sign In
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: '24px 0',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{
                                flex: 1,
                                height: '1px',
                                background: 'rgba(0,0,0,0.1)'
                            }}></div>
                            <span style={{
                                padding: '0 16px',
                                fontSize: '14px'
                            }}>Or</span>
                            <div style={{
                                flex: 1,
                                height: '1px',
                                background: 'rgba(0,0,0,0.1)'
                            }}></div>
                        </div>
                        
                        {/* Google Login Button */}
                        <GoogleLoginButton />
                    </form>
                ) : (
                    <form onSubmit={handleRegister}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Name
                            </label>
                            <input
                                type="text"
                                value={registerForm.name}
                                onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                                className="mobile-input"
                                placeholder="Enter your name"
                                required
                                style={{ 
                                    borderColor: 'rgba(236, 72, 153, 0.2)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Email
                            </label>
                            <input
                                type="email"
                                value={registerForm.email}
                                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                                className="mobile-input"
                                placeholder="Enter your email"
                                required
                                style={{ 
                                    borderColor: 'rgba(236, 72, 153, 0.2)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={registerForm.password}
                                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                                    className="mobile-input"
                                    placeholder="Enter your password"
                                    required
                                    style={{ 
                                        paddingRight: '52px',
                                        borderColor: 'rgba(236, 72, 153, 0.2)',
                                        fontSize: '16px'
                                    }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '18px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        color: 'var(--text-secondary)',
                                        cursor: 'pointer',
                                        padding: '8px',
                                        fontSize: '18px',
                                        zIndex: 1
                                    }}
                                >
                                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                                </button>
                            </div>
                        </div>

                        <div style={{ marginBottom: '28px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: '600',
                                marginBottom: '10px',
                                color: 'var(--text-primary)'
                            }}>
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={registerForm.password_confirmation}
                                onChange={(e) => setRegisterForm({ ...registerForm, password_confirmation: e.target.value })}
                                className="mobile-input"
                                placeholder="Confirm your password"
                                required
                                style={{ 
                                    borderColor: 'rgba(236, 72, 153, 0.2)',
                                    fontSize: '16px'
                                }}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="mobile-button mobile-button-primary"
                            style={{ 
                                width: '100%', 
                                marginBottom: '16px',
                                background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                                fontSize: '16px',
                                fontWeight: '700',
                                boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin" style={{ display: 'inline-block', marginRight: '8px' }}>⏳</span>
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <span style={{ marginRight: '8px', fontSize: '18px' }}>✨</span>
                                    Create Account
                                </>
                            )}
                        </button>

                        {/* Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: '24px 0',
                            color: 'var(--text-secondary)'
                        }}>
                            <div style={{
                                flex: 1,
                                height: '1px',
                                background: 'rgba(0,0,0,0.1)'
                            }}></div>
                            <span style={{
                                padding: '0 16px',
                                fontSize: '14px'
                            }}>Or</span>
                            <div style={{
                                flex: 1,
                                height: '1px',
                                background: 'rgba(0,0,0,0.1)'
                            }}></div>
                        </div>
                        
                        {/* Google Login Button */}
                        <GoogleLoginButton />
                    </form>
                )}

                <div style={{ 
                    textAlign: 'center', 
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(0,0,0,0.08)'
                }}>
                    <button
                        type="button"
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError('');
                        }}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--primary)',
                            fontSize: '15px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            padding: '12px',
                            textDecoration: 'underline',
                            textUnderlineOffset: '4px'
                        }}
                    >
                        {isRegister ? '← Already have an account? Sign in' : "Don't have an account? Create one →"}
                    </button>
                </div>
            </div>
        </>
    );
}

