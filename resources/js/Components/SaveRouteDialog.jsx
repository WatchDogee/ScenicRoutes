import React, { useState } from 'react';
import axios from 'axios';
import { FaTimes, FaSave, FaDownload } from 'react-icons/fa';
import { showToast } from './ToastContainer';
import { exportRouteToGPX, downloadGPX } from '../utils/gpxUtils';

export default function SaveRouteDialog({ route, routeName, auth, onClose, onSaved }) {
    const [routeNameInput, setRouteNameInput] = useState(routeName || '');
    const [description, setDescription] = useState('');
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [exporting, setExporting] = useState(false);

    const handleSave = async () => {
        if (!auth?.token) {
            showToast('Please log in to save routes', 'error', 3000);
            return;
        }

        if (!routeNameInput.trim()) {
            showToast('Please enter a route name', 'error', 3000);
            return;
        }

        setSaving(true);
        try {
            // Calculate route statistics if not present
            const routeData = {
                road_name: routeNameInput.trim(),
                route_type: 'route', // Mark as route (not road)
                coordinates: route.coordinates || [],
                distance: route.distance ? route.distance / 1000 : null, // Convert to km
                length: route.distance || null, // Keep in meters
                twistiness: route.curvature || null,
                corner_count: route.corner_count || null,
                elevation_gain: route.elevation_gain || null,
                elevation_loss: route.elevation_loss || null,
                max_elevation: route.max_elevation || null,
                min_elevation: route.min_elevation || null,
                description: description.trim() || null,
                is_public: isPublic
            };

            const response = await axios.post('/api/saved-roads', routeData, {
                headers: { Authorization: `Bearer ${auth.token}` }
            });

            console.log('Route saved response:', response.data);
            
            showToast('Route saved successfully!', 'success', 3000);
            
            // Trigger refresh of saved roads/routes lists with a small delay to ensure backend has processed
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('savedRoadsUpdated'));
            }, 500);
            
            if (onSaved) {
                onSaved(response.data);
            }
            onClose();
        } catch (error) {
            console.error('Error saving route:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save route';
            showToast(errorMessage, 'error', 4000);
        } finally {
            setSaving(false);
        }
    };

    const handleExportGPX = async () => {
        if (!route || !route.coordinates || route.coordinates.length < 2) {
            showToast('Invalid route data for export', 'error', 3000);
            return;
        }

        setExporting(true);
        try {
            const gpxContent = await exportRouteToGPX(
                route,
                routeNameInput.trim() || 'Route',
                description.trim() || '',
                auth?.token
            );
            downloadGPX(gpxContent, routeNameInput.trim() || 'route');
            showToast('GPX file downloaded', 'success', 2000);
        } catch (error) {
            console.error('Error exporting GPX:', error);
            const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to export GPX';
            showToast(errorMessage, 'error', 4000);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[1000]">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Save Route</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Route Name *
                        </label>
                        <input
                            type="text"
                            value={routeNameInput}
                            onChange={(e) => setRouteNameInput(e.target.value)}
                            placeholder="Enter route name"
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={255}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add a description..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            maxLength={1000}
                        />
                    </div>

                    {auth?.token && (
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                id="isPublic"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                className="mr-2"
                            />
                            <label htmlFor="isPublic" className="text-sm text-gray-700">
                                Make this route public
                            </label>
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || !routeNameInput.trim() || !auth?.token}
                            className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded flex items-center justify-center"
                        >
                            <FaSave className="mr-2" />
                            {saving ? 'Saving...' : 'Save Route'}
                        </button>
                        <button
                            onClick={handleExportGPX}
                            disabled={exporting}
                            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded flex items-center justify-center"
                        >
                            <FaDownload className="mr-2" />
                            {exporting ? 'Exporting...' : 'Export GPX'}
                        </button>
                    </div>

                    {!auth?.token && (
                        <div className="text-sm text-gray-600 bg-yellow-50 p-3 rounded border border-yellow-200">
                            <p>Log in to save routes to your account. You can still export as GPX without logging in.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
