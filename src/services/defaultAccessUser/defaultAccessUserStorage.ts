
import { storage } from "../storage/storage";

import { DefaultAccessUser } from "./useDefaultAccessUserService";

const KEY = 'DefaultAccessAgilityApp';


async function set(ac: DefaultAccessUser): Promise<void> {
    await storage.setItem(KEY, ac)
}

async function get(): Promise<DefaultAccessUser | null> {
    try {
        const dau = await storage.getItem<DefaultAccessUser>(KEY);
        console.log(dau);
        return dau;
    } catch (err) {
        console.error("Erro ao buscar DefaultAccessUser:", err);
        return null;
    }
}


async function remove(): Promise<void> {
    await storage.removeItem(KEY)
}

export const defaultAccessUserStorage = { set, get, remove }