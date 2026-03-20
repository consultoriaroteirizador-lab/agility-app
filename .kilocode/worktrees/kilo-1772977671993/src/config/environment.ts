import Constants from 'expo-constants';

export type EnvironmentType = 'production' | 'development';

// Lê o ambiente das variáveis injetadas pelo EAS Build
export const currentEnvironment: EnvironmentType =
  (Constants.expoConfig?.extra?.appEnv as EnvironmentType) || 'development';

// API Key centralizada
export const API_KEY: string =
  Constants.expoConfig?.extra?.apiKey || 'D41D8CD98F00B204E9800998ECF8427E';

// Helpers para verificação de ambiente
export const isProduction = currentEnvironment === 'production';
export const isDevelopment = currentEnvironment === 'development';
