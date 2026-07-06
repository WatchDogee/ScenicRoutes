import React, { useState, useRef } from 'react';
import axios from 'axios';
import { FaUpload, FaFileImport, FaSpinner, FaCheck, FaTimes, FaLink } from 'react-icons/fa';

export default function GPXImport({ onImportComplete, auth = null }) {
    const [importing, setImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState(false);
    const [importError, setImportError] = useState(null);
    const [importedRoute, setImportedRoute] = useState(null);
    const [importMethod, setImportMethod] = useState('file'); // 'file' or 'url'
    const [gpxUrl, setGpxUrl] = useState('');
    const fileInputRef = useRef(null);

    const handleFileImport = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith('.gpx') && !file.type.includes('xml')) {
            setImportError('Please select a GPX file (.gpx)');
            return;
        }

        setImporting(true);
        setImportError(null);
        setImportSuccess(false);
        setImportedRoute(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await axios.post(
                '/api/routes/import/gpx',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {})
                    }
                }
            );

            if (response.data.success && response.data.route) {
                setImportedRoute(response.data.route);
                setImportSuccess(true);
                
                if (onImportComplete) {
                    onImportComplete(response.data.route);
                }

                // Zoom to imported route bounds - only if we have valid coordinates
                if (response.data.route.coordinates && 
                    response.data.route.coordinates.length > 0 &&
                    response.data.route.coordinates[0]?.lat !== undefined &&
                    response.data.route.coordinates[0]?.lng !== undefined) {
                    setTimeout(() => {
                        window.dispatchEvent(new CustomEvent('zoomToRoute', { 
                            detail: { coordinates: response.data.route.coordinates } 
                        }));
                    }, 300);
                }
            } else {
                setImportError('Failed to parse GPX file');
            }
        } catch (error) {
            console.error('GPX import error:', error);
            setImportError(error.response?.data?.error || 'Failed to import GPX file');
        } finally {
            setImporting(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleUrlImport = async () => {
        if (!gpxUrl.trim()) {
            setImportError('Please enter a valid URL');
            return;
        }

        setImporting(true);
        setImportError(null);
        setImportSuccess(false);
        setImportedRoute(null);

        try {
            const response = await axios.post(
                '/api/routes/import/gpx-url',
                { url: gpxUrl },
                {
                    headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
                }
            );

            if (response.data.success && response.data.route) {
                setImportedRoute(response.data.route);
                setImportSuccess(true);
                setGpxUrl(''); // Clear URL
                
                if (onImportComplete) {
                    onImportComplete(response.data.route);
                }
            } else {
                setImportError('Failed to parse GPX file from URL');
            }
        } catch (error) {
            console.error('GPX URL import error:', error);
            setImportError(error.response?.data?.error || 'Failed to import GPX from URL');
        } finally {
            setImporting(false);
        }
    };

    const handleFileButtonClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center mb-4">
                <FaFileImport className="mr-2 text-blue-600 text-xl" />
                <h3 className="text-lg font-semibold">Import GPX Route</h3>
            </div>

            {/* Method selector */}
            <div className="mb-4 flex gap-2">
                <button
                    onClick={() => {
                        setImportMethod('file');
                        setImportError(null);
                        setImportSuccess(false);
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                        importMethod === 'file'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    <FaUpload className="inline mr-2" />
                    From File
                </button>
                <button
                    onClick={() => {
                        setImportMethod('url');
                        setImportError(null);
                        setImportSuccess(false);
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                        importMethod === 'url'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                >
                    <FaLink className="inline mr-2" />
                    From URL
                </button>
            </div>

            {/* File import */}
            {importMethod === 'file' && (
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".gpx,.xml"
                        onChange={handleFileImport}
                        className="hidden"
                    />
                    <button
                        onClick={handleFileButtonClick}
                        disabled={importing}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {importing ? (
                            <>
                                <FaSpinner className="mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <FaUpload className="mr-2" />
                                Choose GPX File
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* URL import */}
            {importMethod === 'url' && (
                <div>
                    <div className="flex gap-2">
                        <input
                            type="url"
                            value={gpxUrl}
                            onChange={(e) => setGpxUrl(e.target.value)}
                            placeholder="https://example.com/route.gpx"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={importing}
                        />
                        <button
                            onClick={handleUrlImport}
                            disabled={importing || !gpxUrl.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
                        >
                            {importing ? (
                                <FaSpinner className="animate-spin" />
                            ) : (
                                <>
                                    <FaLink className="mr-2" />
                                    Import
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Success message */}
            {importSuccess && importedRoute && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center text-green-800 mb-2">
                        <FaCheck className="mr-2" />
                        <span className="font-semibold">Route imported successfully!</span>
                    </div>
                    <div className="text-sm text-green-700">
                        <p><strong>Name:</strong> {importedRoute.name || 'Unnamed Route'}</p>
                        <p><strong>Distance:</strong> {importedRoute.distance_km?.toFixed(2) || 'N/A'} km</p>
                        <p><strong>Points:</strong> {importedRoute.coordinates?.length || 0} coordinates</p>
                        {importedRoute.waypoints && importedRoute.waypoints.length > 0 && (
                            <p><strong>Waypoints:</strong> {importedRoute.waypoints.length}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Error message */}
            {importError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center text-red-800">
                        <FaTimes className="mr-2" />
                        <span className="font-semibold">Import failed</span>
                    </div>
                    <p className="text-sm text-red-700 mt-1">{importError}</p>
                </div>
            )}
        </div>
    );
}