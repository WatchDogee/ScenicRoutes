import axios from 'axios';

/**
 * Fire-and-forget telemetry logger.
 * @param {string} eventType
 * @param {object} payload
 * @param {string|null} context
 */
export function logTelemetryEvent(eventType, payload = {}, context = null) {
    if (!eventType) return;

    axios.post('/api/telemetry/events', {
        event_type: eventType,
        payload,
        context,
    }).catch((error) => {
        if (import.meta.env.DEV) {
            console.debug('Telemetry failed', eventType, error?.message);
        }
    });
}





