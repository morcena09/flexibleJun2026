// config.js - Environment-based configuration
(function() {
    // Replace values below with your own environment-specific configuration
    const envConfig = {
        REST_RELAY_URL: 'https://rest-relay-one.vercel.app/api/v1/request-tunnel', //Vercel backend/restRelay linked project root url + /api/v1/request-tunnel route
        TOKEN_GENERATOR_URL: 'https://token-generator-phi-navy.vercel.app/api/v1/generateRtmToken', //Vercel backend/tokenGenerator linked project root url + /api/v1/generateRtmToken route
        CLASSROOM_HOST: 'https://flexible-jun2026.vercel.app/classroom', //Vercel frontend folder linked project root url + /classroom route
        TURNSTILE_SITE_KEY: '', // Replace this string with your real CF Site key!
        LANDING_PAGE_URL: 'https://flexible-jun2026.vercel.app' //Vercel frontend folder linked project root url
    };

    let storedConfig = {};
    try {
        const storedConfigJson = sessionStorage.getItem('APP_CONFIG');
        storedConfig = storedConfigJson ? JSON.parse(storedConfigJson) : {};
    } catch (err) {
        console.warn('⚠️ Invalid APP_CONFIG stored in sessionStorage, using defaults.', err);
        storedConfig = {};
    }

    const mergedConfig = Object.assign({}, envConfig, storedConfig);
    sessionStorage.setItem('APP_CONFIG', JSON.stringify(mergedConfig));
    window.APP_CONFIG = mergedConfig;

    console.log('✅ Config loaded from sessionStorage:', mergedConfig);
})();