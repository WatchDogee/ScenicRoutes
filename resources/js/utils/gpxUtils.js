/**
 * GPX utility functions for frontend
 */

/**
 * Download GPX content as a file
 * @param {string} gpxContent - GPX XML content
 * @param {string} filename - Filename (without .gpx extension)
 */
export function downloadGPX(gpxContent, filename = 'route') {
    const blob = new Blob([gpxContent], { type: 'application/gpx+xml' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${sanitizeFilename(filename)}.gpx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
}

/**
 * Sanitize filename for download
 * @param {string} filename
 * @returns {string}
 */
export function sanitizeFilename(filename) {
    return filename
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 100) || 'route';
}

/**
 * Export route to GPX format
 * @param {Object} route - Route object with coordinates
 * @param {string} name - Route name
 * @param {string} description - Route description
 * @param {string} authToken - Optional auth token
 * @returns {Promise<string>} GPX content
 */
export async function exportRouteToGPX(route, name = 'Route', description = '', authToken = null) {
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
        '/api/routes/export/gpx',
        {
            route: route,
            name: name,
            description: description
        },
        {
            responseType: 'blob',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
    );

    return response.data;
}

/**
 * Import GPX from file
 * @param {File} file - GPX file
 * @param {string} authToken - Optional auth token
 * @returns {Promise<Object>} Parsed route data
 */
export async function importGPXFromFile(file, authToken = null) {
    const axios = (await import('axios')).default;
    
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(
        '/api/routes/import/gpx',
        formData,
        {
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
            }
        }
    );

    if (response.data.success && response.data.route) {
        return response.data.route;
    }
    
    throw new Error('Failed to parse GPX file');
}

/**
 * Import GPX from URL
 * @param {string} url - GPX file URL
 * @param {string} authToken - Optional auth token
 * @returns {Promise<Object>} Parsed route data
 */
export async function importGPXFromURL(url, authToken = null) {
    const axios = (await import('axios')).default;
    
    const response = await axios.post(
        '/api/routes/import/gpx-url',
        { url: url },
        {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        }
    );

    if (response.data.success && response.data.route) {
        return response.data.route;
    }
    
    throw new Error('Failed to parse GPX from URL');
}

/**
 * Export saved road to GPX
 * @param {number} savedRoadId - Saved road ID
 * @param {string} authToken - Auth token (required)
 * @returns {Promise<Blob>} GPX file blob
 */
export async function exportSavedRoadToGPX(savedRoadId, authToken) {
    const axios = (await import('axios')).default;
    
    const response = await axios.get(
        `/api/routes/export/saved-road/${savedRoadId}`,
        {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${authToken}` }
        }
    );

    return response.data;
}

/**
 * Export collection to GPX
 * @param {number} collectionId - Collection ID
 * @param {string} authToken - Auth token (required)
 * @returns {Promise<Blob>} GPX file blob
 */
export async function exportCollectionToGPX(collectionId, authToken) {
    const axios = (await import('axios')).default;
    
    const response = await axios.get(
        `/api/routes/export/collection/${collectionId}`,
        {
            responseType: 'blob',
            headers: { Authorization: `Bearer ${authToken}` }
        }
    );

    return response.data;
}




