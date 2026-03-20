
import { useContext } from "react";

import { DefaultAccessUserContext } from "./Providers/DefaultAccessUserProvider";

export type DefaultAccessUser = {
    firstAccess: boolean;
}



export interface DefaultAccessUserState {
    defaultAccessUser: DefaultAccessUser | null;
    saveDefaultAccessUser: (dau: DefaultAccessUser) => Promise<void>;
    removeDefaultAccessUser: () => Promise<void>;
    changeAllowsBiometrics: (allows: boolean) => Promise<void>;
    isLoading: boolean;

}

export function useDefaultAccessUserService(): DefaultAccessUserState {
    const context = useContext(DefaultAccessUserContext)


    if (!context) {
        throw new Error('AUthCredentials should be used within a AuthCredentialsProvider')

    }

    return context
};

