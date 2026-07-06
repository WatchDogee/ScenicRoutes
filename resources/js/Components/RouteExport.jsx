import React, { useState } from 'react';
import axios from 'axios';
import { FaDownload, FaFileExport, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';

export default function RouteExport({ route, routeName = 'Route', routeDescription = '', auth = null, onExportComplete, compact = false }) {
    const [exporting, setExporting] = useState(false);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [exportError, setExportError] = useState(null);

    const handleExportGPX = async () => {
        if (!route || !route.coordinates || route.coordinates.length === 0) {
            setExportError('No route to export');
            return;
        }

        setExporting(true);
        setExportError(null);
        setExportSuccess(false);

        try {
            const response = await axios.post(
                '/api/routes/export/gpx',
                {
                    route: route,
                    name: routeName,
                    description: routeDescription
                },
                {
                    responseType: 'blob',
                    headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
                }
            );

            // Create download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${sanitizeFilename(routeName)}.gpx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            setExportSuccess(true);
            if (onExportComplete) {
                onExportComplete('gpx');
            }

            // Reset success message after 3 seconds
            setTimeout(() => setExportSuccess(false), 3000);
        } catch (error) {
            console.error('GPX export error:', error);
            setExportError(error.response?.data?.error || 'Failed to export GPX file');
        } finally {
            setExporting(false);
        }
    };

    const sanitizeFilename = (filename) => {
        return filename.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100) || 'route';
    };

    if (!route || !route.coordinates || route.coordinates.length === 0) {
        return null;
    }

    return (
        <div className="route-export inline-block">
            <button
                onClick={handleExportGPX}
                disabled={exporting}
                className={compact 
                    ? "flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 font-bold shadow-md disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors mr-2"
                    : "flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                }
                title="Export route to GPX file"
            >
                {exporting ? (
                    <>
                        <FaSpinner className="mr-2 animate-spin" />
                        Exporting...
                    </>
                ) : exportSuccess ? (
                    <>
                        <FaCheck className="mr-2" />
                        Exported!
                    </>
                ) : (
                    <>
                        <FaDownload className="mr-2" />
                        Export GPX
                    </>
                )}
            </button>

            {exportError && (
                <div className="mt-2 text-sm text-red-600 flex items-center">
                    <FaTimes className="mr-1" />
                    {exportError}
                </div>
            )}
        </div>
    );
}




