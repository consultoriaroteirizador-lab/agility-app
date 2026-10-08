// expo-secure-store nao tem implementacao web: guarda no localStorage do navegador.
/* global localStorage */
// E o primeiro modulo de autenticacao carregado, entao tambem aplica o ajuste de FormData.
require('./formdata-polyfill');

const PREFIX = 'web-smoke:';
const get = (key) => {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
};
const set = (key, value) => {
  try {
    localStorage.setItem(PREFIX + key, value);
  } catch {}
};
const remove = (key) => {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {}
};

module.exports = {
  __esModule: true,
  getItemAsync: async (key) => get(key),
  setItemAsync: async (key, value) => set(key, value),
  deleteItemAsync: async (key) => remove(key),
  getItem: (key) => get(key),
  setItem: (key, value) => set(key, value),
  isAvailableAsync: async () => true,
  canUseBiometricAuthentication: () => false,
  AFTER_FIRST_UNLOCK: 0,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 1,
  ALWAYS: 2,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 3,
  ALWAYS_THIS_DEVICE_ONLY: 4,
  WHEN_UNLOCKED: 5,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
};
