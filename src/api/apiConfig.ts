import axios from 'axios';

import { urls } from '@/config/urls';

import { baseResponseAdapter } from './baseResponseAdapter';

/**
 * O portão do log é `__DEV__` PURO — nunca `isDevelopment`.
 *
 * `isDevelopment` sai de `Constants.expoConfig.extra.appEnv`, que por sua vez sai
 * de `process.env.APP_ENV || 'development'`. Um build sem a variável injetada
 * (era o caso do profile `production` do EAS) liga o log inteiro no app da loja:
 * corpo de request e response em claro no logcat, senha do login inclusive.
 * `__DEV__` é resolvido pelo Metro em tempo de build e some por dead-code
 * elimination no release — nenhuma configuração errada consegue reabrir isso.
 */
const LOG_HTTP = __DEV__;

/** Campos que não entram no log nem em desenvolvimento. */
const SENSITIVE_KEYS = new Set([
  'password',
  'currentPassword',
  'newPassword',
  'newPasswordConfirmation',
  'accessToken',
  'refreshToken',
  'access_token',
  'refresh_token',
  'pickupCode',
  'deliveryCode',
]);

/**
 * Troca o valor de campo sensível por `***`. Recursivo porque o corpo do login e
 * o do refresh aninham os tokens dentro de `result`.
 */
function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, val]) => [
      key,
      SENSITIVE_KEYS.has(key) ? '***' : redact(val, depth + 1),
    ])
  );
}

function setupResponseInterceptor(apiInstance: ReturnType<typeof axios.create>) {
  apiInstance.interceptors.response.use(
    (response) => {
      if (LOG_HTTP) {
        const apiName = getApiName(response.config.baseURL || '');
        console.log(`[${apiName}] - Response: Status`, response.config.url, response.status);
        console.log(`[${apiName}] - Response: Data`, redact(response.data));
      }
      return response;
    },
    (error) => {
      const requestUrl = error.config?.url || '';
      const status = error.response?.status;
      const hasApiKey = !!error.config?.headers?.['x-api-key'];
      const hasAuthHeader = !!error.config?.headers?.Authorization;

      if (LOG_HTTP && status === 401) {
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
        if (LOG_HTTP) {
          console.log('[API Config] Rota pública detectada (x-api-key sem Authorization) - skipRefreshToken marcado:', requestUrl);
        }
      }

      if (LOG_HTTP) {
        // Só a forma do erro. Duas linhas acima o objeto recebeu `config`, que
        // carrega o header Authorization e o corpo da request que falhou — o do
        // login inclusive. Logar o objeto inteiro reabria, dentro do `__DEV__`,
        // exatamente o vazamento que o resto deste arquivo fecha.
        console.error('API Error:', {
          url: requestUrl,
          status,
          message: (responseAdapterError as { error?: { message?: string } })?.error?.message,
        });
      }
      return Promise.reject(responseAdapterError);
    }
  );
}

function setupRequestInterceptor(apiInstance: ReturnType<typeof axios.create>) {
  apiInstance.interceptors.request.use(async (request) => {
    // Rotas públicas marcam `skipAuth: true` para omitir o Authorization APENAS
    // nesta request, sem mexer no header default global (`defaults.headers.common`).
    // Mutar o global causava race: durante o await da chamada pública, requests
    // autenticadas concorrentes (ex.: query de rotas refetchando no login) saíam
    // sem token e tomavam 401.
    if ((request as { skipAuth?: boolean }).skipAuth) {
      const headers = request.headers as unknown as { delete?: (name: string) => void };
      if (typeof headers?.delete === 'function') {
        headers.delete('Authorization');
      } else if (request.headers) {
        delete (request.headers as Record<string, unknown>).Authorization;
      }
    }
    if (LOG_HTTP) {
      const apiName = getApiName(request.baseURL || '');
      console.log(`[${apiName}] Request:`, request.method?.toUpperCase(), request.url);
      console.log(`[${apiName}] Full URL:`, `${request.baseURL}${request.url}`);
      console.log(`[${apiName}] Headers:`, {
        Authorization: request.headers?.Authorization ? 'Bearer ***' : 'NOT SET',
        'Content-Type': request.headers?.['Content-Type'],
        ...Object.keys(request.headers || {}).reduce((acc, key) => {
          // `x-api-key` é credencial de rota pública — nunca vai inteira para o log.
          if (key === 'Authorization') return acc;
          acc[key] = key.toLowerCase() === 'x-api-key' ? '***' : request.headers[key];
          return acc;
        }, {} as Record<string, any>)
      });
      if (request.data) {
        console.log(`[${apiName}] Body:`, redact(request.data));
      }
    }
    return request;
  });
}

const apiIdentity = axios.create({
  baseURL: `${urls.identity}`,
  timeout: 60000, // 60s - sem isto, um refresh-token travado prende o app no spinner de boot para sempre
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
