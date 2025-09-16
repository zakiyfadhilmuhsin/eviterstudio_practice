/**
 * Authentication Utilities for Secure Google OAuth Implementation
 * Provides security functions, token management, and CSRF protection
 */

// Security Configuration
const AUTH_CONFIG = {
    API_BASE_URL: 'http://localhost:3018',
    TOKEN_EXPIRATION_TIME: 15 * 60 * 1000, // 15 minutes
    CSRF_TOKEN_LENGTH: 32,
    SESSION_STORAGE_PREFIX: 'auth_',
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000
};

/**
 * Security Utilities
 */
class SecurityUtils {
    /**
     * Generate cryptographically secure random string
     */
    static generateSecureRandom(length = 32) {
        const array = new Uint8Array(length);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Generate CSRF token
     */
    static generateCSRFToken() {
        return this.generateSecureRandom(AUTH_CONFIG.CSRF_TOKEN_LENGTH);
    }

    /**
     * Create secure state parameter for OAuth
     */
    static createOAuthState(redirectTo = null) {
        const state = {
            csrf: this.generateCSRFToken(),
            timestamp: Date.now(),
            nonce: this.generateSecureRandom(16),
            redirectTo: redirectTo || window.location.href
        };

        return btoa(JSON.stringify(state));
    }

    /**
     * Verify OAuth state parameter
     */
    static verifyOAuthState(stateParam, expectedCSRF) {
        try {
            const state = JSON.parse(atob(stateParam));

            // Check required fields
            if (!state.csrf || !state.timestamp || !state.nonce) {
                throw new Error('Invalid state structure');
            }

            // Verify CSRF token
            if (state.csrf !== expectedCSRF) {
                throw new Error('CSRF token mismatch');
            }

            // Check timestamp (max 10 minutes old)
            const maxAge = 10 * 60 * 1000;
            if (Date.now() - state.timestamp > maxAge) {
                throw new Error('State expired');
            }

            return state;
        } catch (error) {
            console.error('State verification failed:', error);
            return null;
        }
    }

    /**
     * Sanitize HTML to prevent XSS
     */
    static sanitizeHTML(input) {
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    /**
     * Validate URL to prevent redirect attacks
     */
    static isValidRedirectURL(url) {
        try {
            const parsed = new URL(url);
            // Only allow same origin or specific trusted domains
            const allowedOrigins = [
                window.location.origin,
                'http://localhost:3018',
                'https://localhost:3018'
            ];

            return allowedOrigins.includes(parsed.origin);
        } catch {
            return false;
        }
    }
}

/**
 * Token Management
 */
class TokenManager {
    /**
     * Store authentication token securely
     */
    static storeToken(token, expirationTime = null) {
        try {
            const expiration = expirationTime || (Date.now() + AUTH_CONFIG.TOKEN_EXPIRATION_TIME);

            sessionStorage.setItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}token`, token);
            sessionStorage.setItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}expiration`, expiration.toString());

            // Set up auto-cleanup
            this.scheduleTokenCleanup(expiration);

            return true;
        } catch (error) {
            console.error('Failed to store token:', error);
            return false;
        }
    }

    /**
     * Retrieve authentication token
     */
    static getToken() {
        try {
            const token = sessionStorage.getItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}token`);
            const expiration = sessionStorage.getItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}expiration`);

            if (!token || !expiration) {
                return null;
            }

            // Check if token is expired
            if (Date.now() >= parseInt(expiration)) {
                this.clearToken();
                return null;
            }

            return token;
        } catch (error) {
            console.error('Failed to retrieve token:', error);
            return null;
        }
    }

    /**
     * Clear authentication token
     */
    static clearToken() {
        try {
            sessionStorage.removeItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}token`);
            sessionStorage.removeItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}expiration`);

            if (this.cleanupTimer) {
                clearTimeout(this.cleanupTimer);
                this.cleanupTimer = null;
            }
        } catch (error) {
            console.error('Failed to clear token:', error);
        }
    }

    /**
     * Check if token is valid and not expired
     */
    static isTokenValid() {
        return this.getToken() !== null;
    }

    /**
     * Get token expiration time
     */
    static getTokenExpiration() {
        const expiration = sessionStorage.getItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}expiration`);
        return expiration ? new Date(parseInt(expiration)) : null;
    }

    /**
     * Get time remaining until token expires
     */
    static getTimeUntilExpiration() {
        const expiration = this.getTokenExpiration();
        return expiration ? Math.max(0, expiration.getTime() - Date.now()) : 0;
    }

    /**
     * Schedule automatic token cleanup
     */
    static scheduleTokenCleanup(expirationTime) {
        if (this.cleanupTimer) {
            clearTimeout(this.cleanupTimer);
        }

        const delay = expirationTime - Date.now();
        if (delay > 0) {
            this.cleanupTimer = setTimeout(() => {
                this.clearToken();
                // Trigger session expired event
                window.dispatchEvent(new CustomEvent('sessionExpired'));
            }, delay);
        }
    }
}

/**
 * API Request Helper with Security Features
 */
class SecureAPIClient {
    /**
     * Make authenticated API request with retry logic
     */
    static async request(endpoint, options = {}) {
        const token = TokenManager.getToken();

        if (!token) {
            throw new Error('No valid authentication token');
        }

        const defaultOptions = {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        const requestOptions = { ...defaultOptions, ...options };
        const url = `${AUTH_CONFIG.API_BASE_URL}${endpoint}`;

        // Retry logic
        for (let attempt = 0; attempt < AUTH_CONFIG.MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                const response = await fetch(url, requestOptions);

                // Handle authentication errors
                if (response.status === 401) {
                    TokenManager.clearToken();
                    throw new Error('Authentication failed');
                }

                // Handle rate limiting
                if (response.status === 429) {
                    const retryAfter = response.headers.get('Retry-After');
                    const delay = retryAfter ? parseInt(retryAfter) * 1000 : AUTH_CONFIG.RETRY_DELAY * (attempt + 1);

                    if (attempt < AUTH_CONFIG.MAX_RETRY_ATTEMPTS - 1) {
                        await this.delay(delay);
                        continue;
                    }
                }

                return response;
            } catch (error) {
                if (attempt === AUTH_CONFIG.MAX_RETRY_ATTEMPTS - 1) {
                    throw error;
                }

                await this.delay(AUTH_CONFIG.RETRY_DELAY * (attempt + 1));
            }
        }
    }

    /**
     * Delay utility for retry logic
     */
    static delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * GET request wrapper
     */
    static async get(endpoint) {
        const response = await this.request(endpoint, { method: 'GET' });
        return response.json();
    }

    /**
     * POST request wrapper
     */
    static async post(endpoint, data = null) {
        const options = { method: 'POST' };
        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await this.request(endpoint, options);
        return response.json();
    }

    /**
     * DELETE request wrapper
     */
    static async delete(endpoint) {
        const response = await this.request(endpoint, { method: 'DELETE' });
        return response.json();
    }
}

/**
 * Authentication Flow Manager
 */
class AuthFlowManager {
    /**
     * Initialize OAuth flow with security measures
     */
    static initiateGoogleOAuth(redirectTo = null) {
        try {
            // Generate secure state
            const state = SecurityUtils.createOAuthState(redirectTo);

            // Store CSRF token for verification
            const stateData = JSON.parse(atob(state));
            sessionStorage.setItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}csrf`, stateData.csrf);

            // Build OAuth URL
            const oauthUrl = new URL(`${AUTH_CONFIG.API_BASE_URL}/auth/google`);
            oauthUrl.searchParams.set('state', state);

            // Redirect to OAuth provider
            window.location.href = oauthUrl.toString();
        } catch (error) {
            console.error('Failed to initiate OAuth flow:', error);
            throw new Error('OAuth initialization failed');
        }
    }

    /**
     * Handle OAuth callback
     */
    static handleOAuthCallback() {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');
        const error = urlParams.get('error');
        const state = urlParams.get('state');

        // Handle errors
        if (error) {
            this.clearOAuthData();
            throw new Error(`OAuth failed: ${error}`);
        }

        // Verify state parameter
        if (state) {
            const expectedCSRF = sessionStorage.getItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}csrf`);
            const stateData = SecurityUtils.verifyOAuthState(state, expectedCSRF);

            if (!stateData) {
                this.clearOAuthData();
                throw new Error('Invalid OAuth state');
            }
        }

        // Store token
        if (token) {
            TokenManager.storeToken(token);
            this.clearOAuthData();
            return true;
        }

        return false;
    }

    /**
     * Clear OAuth-related data
     */
    static clearOAuthData() {
        sessionStorage.removeItem(`${AUTH_CONFIG.SESSION_STORAGE_PREFIX}csrf`);

        // Clean URL parameters
        if (window.history && window.history.replaceState) {
            const url = new URL(window.location);
            url.searchParams.delete('token');
            url.searchParams.delete('error');
            url.searchParams.delete('state');
            window.history.replaceState({}, document.title, url.toString());
        }
    }

    /**
     * Perform secure logout
     */
    static async logout() {
        try {
            // Call logout endpoint if token exists
            const token = TokenManager.getToken();
            if (token) {
                await SecureAPIClient.post('/auth/logout');
            }
        } catch (error) {
            console.warn('Logout API call failed:', error);
        } finally {
            // Always clear local data
            TokenManager.clearToken();
            this.clearOAuthData();
        }
    }
}

/**
 * UI Security Helpers
 */
class UISecurityHelpers {
    /**
     * Show security status message
     */
    static showSecurityMessage(message, type = 'info', duration = 5000) {
        const messageId = `security-message-${Date.now()}`;
        const messageElement = document.createElement('div');

        const typeClasses = {
            info: 'bg-blue-100 text-blue-800 border-blue-200',
            success: 'bg-green-100 text-green-800 border-green-200',
            warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
            error: 'bg-red-100 text-red-800 border-red-200'
        };

        messageElement.id = messageId;
        messageElement.className = `fixed top-4 right-4 p-4 rounded-lg border z-50 ${typeClasses[type] || typeClasses.info}`;
        messageElement.innerHTML = `
            <div class="flex items-center space-x-2">
                <span>${SecurityUtils.sanitizeHTML(message)}</span>
                <button onclick="document.getElementById('${messageId}').remove()" class="ml-2 text-xl leading-none">&times;</button>
            </div>
        `;

        document.body.appendChild(messageElement);

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (document.getElementById(messageId)) {
                    document.getElementById(messageId).remove();
                }
            }, duration);
        }
    }

    /**
     * Setup security event listeners
     */
    static setupSecurityListeners() {
        // Session expiration handler
        window.addEventListener('sessionExpired', () => {
            this.showSecurityMessage('Your session has expired. Please log in again.', 'warning');
            setTimeout(() => {
                window.location.href = '/google-login.html';
            }, 3000);
        });

        // Page visibility change handler (security measure)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Optional: Clear sensitive data when page is hidden
                // This is a security measure for shared computers
                console.log('Page hidden - consider security measures');
            }
        });

        // Prevent right-click in production (optional)
        if (window.location.hostname !== 'localhost') {
            document.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        }
    }

    /**
     * Validate and sanitize form inputs
     */
    static sanitizeFormData(formData) {
        const sanitized = {};

        for (const [key, value] of Object.entries(formData)) {
            if (typeof value === 'string') {
                sanitized[key] = SecurityUtils.sanitizeHTML(value.trim());
            } else {
                sanitized[key] = value;
            }
        }

        return sanitized;
    }
}

// Export for global use
window.SecurityUtils = SecurityUtils;
window.TokenManager = TokenManager;
window.SecureAPIClient = SecureAPIClient;
window.AuthFlowManager = AuthFlowManager;
window.UISecurityHelpers = UISecurityHelpers;

// Auto-setup security listeners when script loads
document.addEventListener('DOMContentLoaded', () => {
    UISecurityHelpers.setupSecurityListeners();
});

// Handle page unload security
window.addEventListener('beforeunload', () => {
    // Clear any temporary sensitive data
    if (window.tempSecurityData) {
        delete window.tempSecurityData;
    }
});