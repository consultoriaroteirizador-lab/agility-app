import { currentEnvironment, EnvironmentType } from './environment';

export type Urls = {
  identity: string;
  agilityApi: string;
};

const urlsByEnv: Record<EnvironmentType, Urls> = {
  production: {
    identity: 'https://dev.agilitylabs.com.br',
    agilityApi: 'https://dev.agilitylabs.com.br',

  },
  // development: {
  //   identity: 'http://10.156.41.249:3000',
  //   agilityApi: 'http://10.156.41.249:3000',
  // },
  development: {
    identity: 'http://192.168.15.11:3000',
    agilityApi: 'http://192.168.15.11:3000',
  },
  // development: {
  //   identity: 'https://dev.agilitylabs.com.br',
  //   agilityApi: 'https://dev.agilitylabs.com.br',
  // },
};

export const urls = urlsByEnv[currentEnvironment];
