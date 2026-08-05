// API service for communicating with backend
class ApiService {
    constructor() {
        this.baseURL = '/api';
        this.token = localStorage.getItem('adminToken');
    }

    // Get token from localStorage
    getToken() {
        if (!this.token) {
            this.token = localStorage.getItem('adminToken');
        }
        return this.token;
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('adminToken', token);
        } else {
            localStorage.removeItem('adminToken');
        }
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // ✅ FIX: Always get token from localStorage
        const token = this.getToken();
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Network error' }));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Authentication endpoints
    async login(email, password) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    }

    async verifyToken() {
        return this.request('/auth/verify');
    }

    // Course endpoints
    async getCourses() {
        return this.request('/courses');
    }

    async getCourse(code) {
        return this.request(`/courses/${code}`);
    }

    async getCourseSyllabi(code, semester = null) {
        const params = semester ? `?semester=${semester}` : '';
        return this.request(`/courses/${code}/syllabi${params}`);
    }

    // Syllabus endpoints
    async getSyllabi(filters = {}) {
        const params = new URLSearchParams(filters).toString();
        return this.request(`/syllabi?${params}`);
    }

    async getSyllabus(id) {
        return this.request(`/syllabi/${id}`);
    }

    async uploadSyllabus(courseCode, formData) {
        return this.request(`/syllabi/${courseCode}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.getToken()}`
            },
            body: formData
        });
    }

    async deleteSyllabus(id) {
        return this.request(`/syllabi/${id}`, {
            method: 'DELETE'
        });
    }

    async previewSyllabus(id) {
        return `${this.baseURL}/syllabi/${id}/preview`;
    }

    async downloadSyllabus(id) {
        return `${this.baseURL}/syllabi/${id}/download`;
    }

    // Search endpoint
    async search(query, filters = {}) {
        const params = new URLSearchParams({ q: query, ...filters }).toString();
        return this.request(`/search?${params}`);
    }

    // Admin endpoints
    async getAdminSyllabi() {
        return this.request('/admins/syllabi');
    }

    async getAnalytics() {
        return this.request('/admins/analytics');
    }

    // File upload with progress
    async uploadFileWithProgress(courseCode, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 201) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error(xhr.statusText));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('POST', `${this.baseURL}/syllabi/${courseCode}`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.getToken()}`);
            xhr.send(formData);
        });
    }
}

// Create global API instance
const api = new ApiService();

// ✅ Fix: Window load par token set karo
document.addEventListener('DOMContentLoaded', function() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        api.setToken(token);
        console.log('✅ API token set on page load');
    }
});

// Export for Node.js environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, api };
}