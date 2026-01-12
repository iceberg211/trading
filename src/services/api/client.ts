import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private client: AxiosInstance;

  constructor(baseURL: string = '/api') {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        // 处理 429 限流
        if (error.response?.status === 429) {
          console.error('API 请求过多，请稍后重试');
        }
        return Promise.reject(error);
      }
    );
  }

  get<T = any>(url: string, params?: any) {
    return this.client.get<T>(url, { params });
  }

  post<T = any>(url: string, data?: any) {
    return this.client.post<T>(url, data);
  }
}

export const apiClient = new ApiClient();
