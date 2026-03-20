import axios from 'axios';

import { isDevelopment } from '@/config/environment';
import { urls } from '@/config/urls';

import { baseResponseAdapter } from './baseResponseAdapter';

function setupResponseInterceptor(apiInstance: ReturnType<typeof axios.create>) {
  apiInstance.interceptors.response.use(
    (response) => {
      if (isDevelopment || __DEV__) {
        const apiName = getApiName(response.config.baseURL || '');
        console.log(`[${apiName}] - Response: Status`, response.config.url, response.status);
        console.log(`[${apiName}] - Response: Data`, response.data);
      }
      return response;
    },
    (error) => {
      const requestUrl = error.config?.url || '';
      const status = error.response?.status;
      const hasApiKey = !!error.config?.headers?.['x-api-key'];
      const hasAuthHeader = !!error.config?.headers?.Authorization;

      if ((isDevelopment || __DEV__) && status === 401) {
        const apiName = getApiName(error.config?.baseURL || '');
        console.log(`[${apiName}] [API Config] Erro 401 detectado:`, {
          url: requestUrl,
          method: error.config?.method,
          hasApiKey,
          hasAuthHeader,
          fullUrl: `${error.config?.baseURL}${requestUrl}`
        });
      }

      const responseAdapterError = baseResponseAdapter.toBaseResponseError(error);

      // Preservar informações necessárias para o interceptor de 401
      (responseAdapterError as any).response = { status: error.response?.status };
      (responseAdapterError as any).config = error.config;

      // Rotas públicas (x-api-key sem Authorization) não precisam de token
      // 401 significa erro de autenticação/autorização, não token expirado
      // Marcar explicitamente para nunca tentar refresh token
      if (hasApiKey && !hasAuthHeader) {
        (responseAdapterError as any).skipRefreshToken = true;
        if (isDevelopment || __DEV__) {
          console.log('[API Config] Rota pública detectada (x-api-key sem Authorization) - skipRefreshToken marcado:', requestUrl);
        }
      }

      if (isDevelopment || __DEV__) {
        console.error('API Error:', responseAdapterError);
      }
      return Promise.reject(responseAdapterError);
    }
  );
}

// function setupRequestInterceptor(apiInstance: ReturnType<typeof axios.create>) {
//   apiInstance.interceptors.request.use(async (request) => {
//     if (isDevelopment) {
//       console.log('Request:', request.method?.toUpperCase(), request.url);
//       console.log('Body:', request.method?.toUpperCase(), request.data);
//     }
//     return request;
//   });
// }

function setupRequestInterceptor(apiInstance: ReturnType<typeof axios.create>) {
  apiInstance.interceptors.request.use(async (request) => {
    if (isDevelopment || __DEV__) {
      const apiName = getApiName(request.baseURL || '');
      console.log(`[${apiName}] Request:`, request.method?.toUpperCase(), request.url);
      console.log(`[${apiName}] Full URL:`, `${request.baseURL}${request.url}`);
      console.log(`[${apiName}] Headers:`, {
        Authorization: request.headers?.Authorization ? 'Bearer ***' : 'NOT SET',
        'Content-Type': request.headers?.['Content-Type'],
        ...Object.keys(request.headers || {}).reduce((acc, key) => {
          if (key !== 'Authorization') {
            acc[key] = request.headers[key];
          }
          return acc;
        }, {} as Record<string, any>)
      });
      if (request.data) {
        console.log(`[${apiName}] Body:`, request.data);
      }
    }
    return request;
  });
}

const apiIdentity = axios.create({
  baseURL: `${urls.identity}`,
});

const apiAgility = axios.create({
  baseURL: `${urls.agilityApi}`,
  timeout: 60000, // 60 segundos - evita crash em uploads lentos
  maxContentLength: 50 * 1024 * 1024, // 50MB - limite para uploads
  maxBodyLength: 50 * 1024 * 1024, // 50MB - limite para uploads
});

// Setup interceptors para todas as instâncias
[apiIdentity, apiAgility].forEach(
  (api) => {
    setupResponseInterceptor(api);
    setupRequestInterceptor(api);
  }
);

function getApiName(baseURL: string): string {
  if (baseURL.includes('agilitylabs')) return 'API_SERVICE';
  return 'API_UNKNOWN';
}

export { apiIdentity };
export { apiAgility };
// Alias for backward compatibility
export const apiService = apiAgility;
