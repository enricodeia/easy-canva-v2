/**
 * utils.js
 * Utility functions for 3D Scene Editor
 */

const Utils = {
    /**
     * Creates a notification message that appears and disappears automatically
     * @param {string} message - The message to display
     * @param {string} type - Type of notification: 'info', 'success', or 'error'
     * @param {number} duration - How long the notification stays visible (ms)
     * @returns {HTMLElement} The notification element
     */
    createNotification: function(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, duration);
        
        return notification;
    },
    
    /**
     * Generate a unique ID
     * @returns {string} Random ID
     */
    generateId: function() {
        return '_' + Math.random().toString(36).substr(2, 9);
    },
    
    /**
     * Deep clone an object (including nested objects)
     * @param {*} obj - Object to clone
     * @returns {*} Cloned object
     */
    deepClone: function(obj) {
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }
        
        const clone = Array.isArray(obj) ? [] : {};
        
        for (const key in obj) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                clone[key] = this.deepClone(obj[key]);
            }
        }
        
        return clone;
    },
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad: function(degrees) {
        return degrees * (Math.PI / 180);
    },
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radToDeg: function(radians) {
        return radians * (180 / Math.PI);
    },
    
    /**
     * Add event listener with easy removal function
     * @param {HTMLElement} element - DOM element to attach listener to
     * @param {string} eventType - Type of event (e.g., 'click')
     * @param {Function} handler - Event handler function
     * @returns {Function} Function to remove the event listener
     */
    addRemovableEventListener: function(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        return function() {
            element.removeEventListener(eventType, handler);
        };
    },
    
    /**
     * Format number with specified precision
     * @param {number} num - Number to format
     * @param {number} precision - Decimal places
     * @returns {number} Formatted number
     */
    formatNumber: function(num, precision = 2) {
        return Number(num.toFixed(precision));
    },
    
    /**
     * Convert hex color to RGB object
     * @param {string} hex - Hex color string (e.g., "#ff0000")
     * @returns {Object|null} RGB object with r, g, b properties or null if invalid
     */
    hexToRgb: function(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    },
    
    /**
     * Convert RGB values to hex color string
     * @param {number} r - Red (0-255)
     * @param {number} g - Green (0-255)
     * @param {number} b - Blue (0-255)
     * @returns {string} Hex color string
     */
    rgbToHex: function(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    },
    
    /**
     * Throttle function calls to limit execution rate
     * @param {Function} func - Function to throttle
     * @param {number} limit - Time limit in ms
     * @returns {Function} Throttled function
     */
    throttle: function(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    /**
     * Debounce function calls to delay execution until after wait
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    },
    
    /**
     * Check if an object is empty
     * @param {Object} obj - Object to check
     * @returns {boolean} True if empty
     */
    isEmptyObject: function(obj) {
        return Object.keys(obj).length === 0;
    },
    
    /**
     * Linear interpolation between two values
     * @param {number} a - Start value
     * @param {number} b - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number} Interpolated value
     */
    lerp: function(a, b, t) {
        return a + (b - a) * t;
    },
    
    /**
     * Calculate the distance between two 3D points
     * @param {Object} p1 - Point 1 with x, y, z properties
     * @param {Object} p2 - Point 2 with x, y, z properties
     * @returns {number} Distance
     */
    distance3D: function(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    },
    
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Clamped value
     */
    clamp: function(value, min, max) {
        return Math.min(Math.max(value, min), max);
    },
    
    /**
     * Map a value from one range to another
     * @param {number} value - Value to map
     * @param {number} inMin - Input range minimum
     * @param {number} inMax - Input range maximum
     * @param {number} outMin - Output range minimum
     * @param {number} outMax - Output range maximum
     * @returns {number} Mapped value
     */
    mapRange: function(value, inMin, inMax, outMin, outMax) {
        return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    },
    
    /**
     * Create a DOM element with attributes
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes to set
     * @param {string} text - Text content
     * @returns {HTMLElement} Created element
     */
    createElement: function(tag, attrs = {}, text = '') {
        const element = document.createElement(tag);
        
        for (const [key, value] of Object.entries(attrs)) {
            if (key === 'class') {
                element.className = value;
            } else {
                element.setAttribute(key, value);
            }
        }
        
        if (text) {
            element.textContent = text;
        }
        
        return element;
    },
    
    /**
     * Download data as a file
     * @param {string} filename - Name of file to download
     * @param {string} data - Data to include in file
     * @param {string} type - MIME type (default: 'application/json')
     */
    downloadFile: function(filename, data, type = 'application/json') {
        const blob = new Blob([data], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    /**
     * Copy text to clipboard
     * @param {string} text - Text to copy
     * @returns {Promise<void>} Promise that resolves when copied
     */
    copyToClipboard: async function(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.createNotification('Copied to clipboard!', 'success');
        } catch (err) {
            // Fallback for browsers that don't support clipboard API
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.createNotification('Copied to clipboard!', 'success');
        }
    },
    
    /**
     * Get query parameters from URL
     * @returns {Object} Object with query parameters
     */
    getQueryParams: function() {
        const params = {};
        const queryString = window.location.search.substring(1);
        const pairs = queryString.split('&');
        
        for (const pair of pairs) {
            const [key, value] = pair.split('=');
            if (key) {
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            }
        }
        
        return params;
    },
    
    /**
     * Format file size in human-readable format
     * @param {number} bytes - Size in bytes
     * @returns {string} Formatted size (e.g., "1.5 MB")
     */
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Get current date and time in ISO format
     * @returns {string} Current date and time
     */
    getCurrentDateTime: function() {
        return new Date().toISOString();
    },
    
    /**
     * Check if WebGL is supported
     * @returns {boolean} True if WebGL is supported
     */
    isWebGLSupported: function() {
        try {
            const canvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    },
    
    /**
     * Generate a random color
     * @returns {string} Random hex color
     */
    randomColor: function() {
        return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    },
    
    /**
     * Format a THREE.Vector3 as a string
     * @param {THREE.Vector3} vector - Vector to format
     * @param {number} precision - Decimal places (default: 2)
     * @returns {string} Formatted vector string (e.g., "(1.00, 2.00, 3.00)")
     */
    formatVector: function(vector, precision = 2) {
        if (!vector) return "(0, 0, 0)";
        return `(${vector.x.toFixed(precision)}, ${vector.y.toFixed(precision)}, ${vector.z.toFixed(precision)})`;
    },
    
    /**
     * Check if device is mobile
     * @returns {boolean} True if running on a mobile device
     */
    isMobileDevice: function() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    /**
     * Get device pixel ratio (for high DPI displays)
     * @returns {number} Device pixel ratio
     */
    getDevicePixelRatio: function() {
        return window.devicePixelRatio || 1;
    }
};

// Export Utils object for use in other modules
// In browsers, this will be available as window.Utils
window.Utils = Utils;

// Function to update the scene info display
function updateSceneInfo(message, isError = false, type = 'info') {
    const sceneInfo = document.getElementById('scene-info');
    if (!sceneInfo) return;
    
    // Remove any existing classes
    sceneInfo.classList.remove('error', 'success', 'info', 'warning');
    
    // Add appropriate class based on type
    if (isError) {
        sceneInfo.classList.add('error');
    } else {
        sceneInfo.classList.add(type);
    }
    
    // Set the message
    sceneInfo.textContent = message;
    
    // If it's not an error, automatically clear after a short time
    if (!isError && type !== 'error') {
        setTimeout(() => {
            if (sceneInfo.textContent === message) {
                sceneInfo.textContent = 'Click on objects to select them';
                sceneInfo.classList.remove('success', 'info', 'warning');
                sceneInfo.classList.add('info');
            }
        }, 3000);
    }
}

// Make function globally available
window.updateSceneInfo = updateSceneInfo;
