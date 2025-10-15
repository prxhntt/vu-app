
const CONFIG = {
    API_BASE_URL: '/api',
    UPLOAD_PATH: '/uploads',
    MAX_FILE_SIZE: 50 * 1024 * 1024, 
    SUPPORTED_FILE_TYPES: ['application/pdf'],
    DEFAULT_THEME: 'light'
};


if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}