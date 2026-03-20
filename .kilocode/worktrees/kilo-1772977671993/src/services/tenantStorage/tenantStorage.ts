import { storage } from "../storage/storage";

export type TenantInfo = {
    tenantCode: string;
    tenantName?: string;
};

const TENANT_KEY = 'TenantInfoConlifeApp';

async function set(tenant: TenantInfo): Promise<void> {
    await storage.setItem(TENANT_KEY, tenant);
}

async function get(): Promise<TenantInfo | null> {
    try {
        const tenant = await storage.getItem<TenantInfo>(TENANT_KEY);
        return tenant;
    } catch (err) {
        console.error("Erro ao buscar TenantInfo:", err);
        return null;
    }
}

async function remove(): Promise<void> {
    await storage.removeItem(TENANT_KEY);
}

export const tenantStorage = { set, get, remove };
