import Constants from 'expo-constants';

export type EnvironmentType = 'production' | 'development';

// Lê o ambiente das variáveis injetadas pelo EAS Build
export const currentEnvironment: EnvironmentType =
  (Constants.expoConfig?.extra?.appEnv as EnvironmentType) || 'development';

// API Key centralizada
export const API_KEY: string =
  Constants.expoConfig?.extra?.apiKey || '';

// Helpers para verificação de ambiente
export const isProduction = currentEnvironment === 'production';
export const isDevelopment = currentEnvironment === 'development';
