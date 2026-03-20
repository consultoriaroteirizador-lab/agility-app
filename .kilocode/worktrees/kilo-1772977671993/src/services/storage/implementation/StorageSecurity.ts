import * as SecureStore from 'expo-secure-store';

import { Storage } from '../storage';


export const StorageSecurity: Storage = {
    async getItem<T = unknown>(key: string): Promise<T | null> {
        try {
            const value = await SecureStore.getItemAsync(key);
            return value ? (JSON.parse(value) as T) : null;
        } catch (error) {
            console.error("Erro em getItem:", key, error);
            return null;
        }
    },

    async setItem<T>(key: string, value: T): Promise<void> {
        const stringValue = JSON.stringify(value);
        await SecureStore.setItemAsync(key, stringValue);
    },

    async removeItem(key: string): Promise<void> {
        await SecureStore.deleteItemAsync(key);
    }
};
