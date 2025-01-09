import axios, { AxiosInstance, AxiosError } from 'axios';

class ApiService {
    private api: AxiosInstance;

    constructor() {
        this.api = axios.create({
            baseURL: import.meta.env.VITE_API_URL,
        });

        this.setupInterceptors();
    }

    private setupInterceptors() {
        this.api.interceptors.response.use(
            response => response,
            (error: AxiosError) => {
                console.log('API Error Details:', {
                    status: error.response?.status,
                    statusText: error.response?.statusText,
                    data: error.response?.data,
                    config: {
                        url: error.config?.url,
                        method: error.config?.method,
                        headers: error.config?.headers
                    }
                });

                if (error.response?.status === 405) {
                    return Promise.reject({ is405: true, message: 'Captcha required', status: 405 });
                }

                // Handle 400 errors from captcha verification
                if (error.response?.status === 400) {
                    return Promise.reject({
                        message: 'Captcha verification failed. Please try again.',
                        status: 400
                    });
                }

                return Promise.reject({
                    message: error.message || 'An unexpected error occurred',
                    status: error.response?.status
                });
            }
        );
    }

    async makeRequest(token?: string) {
        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            };

            if (token) {
                // Ensure the token is properly formatted and valid
                if (typeof token !== 'string' || token.trim() === '') {
                    throw new Error('Invalid captcha token');
                }
                headers['X-AWS-WAFTOKEN'] = token.trim();
            }

            return await this.api.get('/', { headers });
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }
}

export const apiService = new ApiService();