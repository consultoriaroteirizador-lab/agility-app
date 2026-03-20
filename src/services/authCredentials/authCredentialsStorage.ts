import { AuthCredentials } from "../../domain/Auth";
import { StorageSecurity } from "../storage/implementation/StorageSecurity";



const AUTH_KEY = 'AuthAgilityApp';


async function set(ac: AuthCredentials): Promise<void> {
    await StorageSecurity.setItem(AUTH_KEY, ac)
}

async function get(): Promise<AuthCredentials | null> {
    const ac = await StorageSecurity.getItem<AuthCredentials>(AUTH_KEY)
    return ac;
}

async function remove(): Promise<void> {
    await StorageSecurity.removeItem(AUTH_KEY)
}

export const authCredentialsStorage = { set, get, remove }