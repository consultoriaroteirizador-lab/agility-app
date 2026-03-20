import { useContext } from "react";

import { TenantContext } from "./Providers/TenantProvider";
import { TenantInfo } from "./tenantStorage";

export interface TenantState {
    tenantInfo: TenantInfo | null;
    saveTenant: (info: TenantInfo) => Promise<void>;
    removeTenant: () => Promise<void>;
    isLoading: boolean;
}

export function useTenantService(): TenantState {
    const context = useContext(TenantContext);

    if (!context) {
        throw new Error('useTenantService should be used within a TenantProvider');
    }

    return context;
}
