import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000',
});

// 1. Request Interceptor: Attach the access token to every outgoing request
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401s and silently refresh the token
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401, we haven't retried yet, and it's NOT the refresh route itself failing
        // We use .includes to make sure the check works even with full URLs
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh')) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refresh_token');

            if (refreshToken) {
                try {
                    // Ask backend for a new access token
                    const res = await axios.post('http://localhost:8000/auth/refresh', {}, {
                        headers: { Authorization: `Bearer ${refreshToken}` }
                    });

                    // Save the new access token
                    const newAccessToken = res.data.access_token;
                    localStorage.setItem('token', newAccessToken);

                    // Update the failed request with the new token and retry it!
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // If the refresh token is also expired or invalid, log out
                    console.error("Refresh token expired. Logging out...");
                    localStorage.clear();
                    window.location.href = '/login'; 
                    return Promise.reject(refreshError);
                }
            }
        }
        
        // Handle 429 Too Many Requests (Rate Limiting)
        if (error.response?.status === 429) {
            console.error("Rate limit exceeded. Slow down!");
        }

        return Promise.reject(error);
    }
);

export default api;