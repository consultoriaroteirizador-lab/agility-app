import { createContext, PropsWithChildren, useCallback, useEffect, useState } from "react";

import { defaultAccessUserStorage } from "../defaultAccessUserStorage";
import { DefaultAccessUser, DefaultAccessUserState } from "../useDefaultAccessUserService";

export const DefaultAccessUserContext = createContext<DefaultAccessUserState>({
    defaultAccessUser: {
        firstAccess: true,
    },
    removeDefaultAccessUser: async () => { },
    saveDefaultAccessUser: async () => { },
    changeAllowsBiometrics: async () => { },
    isLoading: false
});

export function DefaultAccessUserProvider({ children }: PropsWithChildren) {
    const [defaultAccessUser, setDefaultAccessUser] = useState<DefaultAccessUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const removeDefaultAccessUser = useCallback(async () => {
        await defaultAccessUserStorage.remove();
        setDefaultAccessUser(null);
    }, []);

    const changeAllowsBiometrics = useCallback(async (allows: boolean) => {
        if (!defaultAccessUser) return;
        const updatedDAU = { ...defaultAccessUser, allowsBiometrics: allows };
        await defaultAccessUserStorage.set(updatedDAU);
        setDefaultAccessUser(updatedDAU);
    }, [defaultAccessUser]);

    const saveDefaultAccessUser = useCallback(async (dau: DefaultAccessUser) => {
        await defaultAccessUserStorage.set(dau);
        setDefaultAccessUser(dau);
    }, []);

    const startDefaultAccessUser = useCallback(async () => {
        try {
            const dau = await defaultAccessUserStorage.get();
            if (dau) {
                setDefaultAccessUser(dau);
            } else {
                setDefaultAccessUser({ firstAccess: true });
            }
        } catch {
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        startDefaultAccessUser();
    }, [startDefaultAccessUser]);

    return (
        <DefaultAccessUserContext.Provider
            value={{
                defaultAccessUser,
                saveDefaultAccessUser,
                removeDefaultAccessUser,
                isLoading,
                changeAllowsBiometrics
            }}
        >
            {children}
        </DefaultAccessUserContext.Provider>
    );
}