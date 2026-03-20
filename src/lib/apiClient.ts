import { apiAgility } from '@/api/apiConfig';

// ApiError type for compatibility with chatAPI
export type ApiError = {
  response?: {
    data?: {
      success?: boolean;
      error?: {
        message?: string;
        code?: string;
      };
    };
    status?: number;
  };
  message?: string;
  config?: any;
};

// apiClient wrapper around the existing apiAgility instance
// This provides compatibility with the chatAPI interface
export const apiClient = {
  async get<T>(url: string, config?: any): Promise<T> {
    const response = await apiAgility.get<T>(url, config);
    return response.data;
  },

  async post<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await apiAgility.post<T>(url, data, config);
    return response.data;
  },

  async patch<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await apiAgility.patch<T>(url, data, config);
    return response.data;
  },

  async put<T>(url: string, data?: any, config?: any): Promise<T> {
    const response = await apiAgility.put<T>(url, data, config);
    return response.data;
  },

  async delete<T>(url: string, config?: any): Promise<T> {
    const response = await apiAgility.delete<T>(url, config);
    return response.data;
  }
};
