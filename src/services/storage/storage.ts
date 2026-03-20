import { asyncStorage } from "./implementation/asyncStorage";
import { StorageSecurity } from "./implementation/StorageSecurity";

export interface Storage {
    getItem: <T = unknown>(key: string) => Promise<T | null>;
    setItem: <T>(key: string, value: T) => Promise<void>;
    removeItem: (key: string) => Promise<void>;
    clearStorage?: () => Promise<void> | null;
}

export let storage: Storage = asyncStorage;

export let storageSecurity: Storage = StorageSecurity



// export function initializerStorage(storageImpl: Storage) {
//     storage = storageImpl
// }
// export function initializerStorageSecurity(storageImpl: Storage) {
//     storage = storageImpl
// }
