import React, { useState, useEffect } from 'react';
import { usePage } from '@inertiajs/react';

export default function FounderBanner() {
    const { auth } = usePage().props;
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Only show if not founder and not dismissed
        if (auth?.user && !auth.user.is_founder && !localStorage.getItem('founderBannerDismissed')) {
            setVisible(true);
        }
    }, [auth]);

    if (!visible) return null;

    const handleDismiss = () => {
        localStorage.setItem('founderBannerDismissed', '1');
        setVisible(false);
    };

    return (
        <div className="fixed top-0 left-0 w-full z-50 bg-yellow-100 text-yellow-900 px-4 py-3 flex items-center justify-between shadow-md animate-fade-in">
            <span>
                🚗 <b>Become a Founding Driver!</b> Lifetime access for €15. <a href="/founder" className="underline font-semibold">Learn more</a>
            </span>
            <button onClick={handleDismiss} className="ml-4 text-yellow-700 hover:text-yellow-900">Dismiss</button>
        </div>
    );
}
