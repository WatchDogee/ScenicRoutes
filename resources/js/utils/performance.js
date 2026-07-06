/**
 * Performance optimization utilities
 */

/**
 * Debounce function - delays execution until after wait time
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function - limits execution to once per wait time
 */
export function throttle(func, wait = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

/**
 * Memoize function results
 */
export function memoize(fn) {
    const cache = new Map();
    return function memoized(...args) {
        const key = JSON.stringify(args);
        if (cache.has(key)) {
            return cache.get(key);
        }
        const result = fn.apply(this, args);
        cache.set(key, result);
        return result;
    };
}

/**
 * Batch API requests
 */
export class RequestBatcher {
    constructor(batchSize = 10, delay = 100) {
        this.batchSize = batchSize;
        this.delay = delay;
        this.queue = [];
        this.timer = null;
    }

    add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            
            if (this.queue.length >= this.batchSize) {
                this.flush();
            } else if (!this.timer) {
                this.timer = setTimeout(() => this.flush(), this.delay);
            }
        });
    }

    async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const batch = this.queue.splice(0, this.batchSize);
        if (batch.length === 0) return;

        try {
            const results = await Promise.allSettled(
                batch.map(item => item.request())
            );
            
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    batch[index].resolve(result.value);
                } else {
                    batch[index].reject(result.reason);
                }
            });
        } catch (error) {
            batch.forEach(item => item.reject(error));
        }

        if (this.queue.length > 0) {
            this.timer = setTimeout(() => this.flush(), this.delay);
        }
    }
}

/**
 * Lazy load images
 */
export function lazyLoadImage(img, src) {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    img.src = src;
                    observer.unobserve(img);
                }
            });
        });
        observer.observe(img);
    } else {
        // Fallback for browsers without IntersectionObserver
        img.src = src;
    }
}

/**
 * Preload resources
 */
export function preloadResource(url, type = 'image') {
    return new Promise((resolve, reject) => {
        if (type === 'image') {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = url;
        } else if (type === 'script') {
            const script = document.createElement('script');
            script.onload = resolve;
            script.onerror = reject;
            script.src = url;
            document.head.appendChild(script);
        }
    });
}



