import { createContext, PropsWithChildren, useCallback, useEffect, useState } from "react";

import { TenantInfo } from "../tenantStorage";
import { tenantStorage } from "../tenantStorage";
import { TenantState } from "../useTenantService";

export const TenantContext = createContext<TenantState>({
    tenantInfo: null,
    saveTenant: async () => { },
    removeTenant: async () => { },
    isLoading: true,
});

export function TenantProvider({ children }: PropsWithChildren) {
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const loadTenant = useCallback(async () => {
        try {
            const tenant = await tenantStorage.get();
            setTenantInfo(tenant);
        } catch (error) {
            console.error('Erro ao carregar tenant:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveTenant = useCallback(async (info: TenantInfo): Promise<void> => {
        await tenantStorage.set(info);
        setTenantInfo(info);
    }, []);

    const removeTenant = useCallback(async (): Promise<void> => {
        await tenantStorage.remove();
        setTenantInfo(null);
    }, []);

    useEffect(() => {
        loadTenant();
    }, [loadTenant]);

    return (
        <TenantContext.Provider value={{
            tenantInfo,
            saveTenant,
            removeTenant,
            isLoading,
        }}>
            {children}
        </TenantContext.Provider>
    );
}
