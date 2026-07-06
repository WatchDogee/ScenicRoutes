import React from 'react';
import { usePage } from '@inertiajs/react';

export default function FounderInfo() {
    const { auth } = usePage().props;
    const isFounder = auth?.user?.is_founder;

    return (
        <div className="max-w-xl mx-auto mt-12 p-6 bg-white rounded shadow text-center">
            <h1 className="text-2xl font-bold mb-4">Founding Driver Lifetime Access</h1>
            {isFounder ? (
                <div className="text-green-700 font-semibold">You are a Founding Driver! 🎉</div>
            ) : (
                <>
                    <p className="mb-4">Support ScenicRoutes and get unlimited route generation for life. One-time payment: <b>€15</b>.</p>
                    <form method="POST" action="/founder/checkout">
                        <button type="submit" className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-6 rounded">
                            Become a Founding Driver
                        </button>
                    </form>
                </>
            )}
        </div>
    );
}
