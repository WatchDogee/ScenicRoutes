import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/app.jsx',              // Web (Inertia.js)
                'resources/js/mobile.jsx',           // Mobile (API-only)
                'resources/js/Pages/Map.jsx',
                'resources/js/Pages/Welcome.jsx',
                'resources/js/Pages/Dashboard.jsx',
                'resources/js/Pages/Settings.jsx',
                'resources/js/Pages/Subscription.jsx',
                'resources/js/Pages/UsageStats.jsx',
                'resources/js/Pages/Auth/Login.jsx',
                'resources/js/Pages/Auth/Register.jsx',
                'resources/js/Pages/Auth/ForgotPassword.jsx',
                'resources/js/Pages/Auth/ForgotPasswordPage.jsx',
                'resources/js/Pages/Auth/ResetPassword.jsx',
                'resources/js/Pages/Auth/ResetPasswordPage.jsx',
                'resources/js/Pages/Auth/VerifyEmail.jsx',
                'resources/js/Pages/Auth/VerifyEmailPage.jsx',
                'resources/js/Pages/Auth/ConfirmPassword.jsx',
                'resources/js/Pages/Profile/Edit.jsx',
            ],
            refresh: true,
        }),
        react(),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    // Vendor chunks
                    'react-vendor': ['react', 'react-dom'],
                    'inertia-vendor': ['@inertiajs/react'],
                    'leaflet-vendor': ['leaflet'],
                    'axios-vendor': ['axios'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    server: {
        open: false,
        proxy: {
            '/api': {
                target: 'http://localhost:8000',
                changeOrigin: true,
            },
        },
    },
    optimizeDeps: {
        include: ['react', 'react-dom', '@inertiajs/react', 'leaflet', 'axios'],
    },
});
