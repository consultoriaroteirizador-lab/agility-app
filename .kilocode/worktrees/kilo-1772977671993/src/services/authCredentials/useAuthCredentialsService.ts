
import { useContext } from "react";

import { AuthCredentials } from "@/domain/Auth/authType";

import { UserAuth, UserCredentials } from "../userAuthInfo/UserAuthInfoType";

import { AuthCredentialsContext } from "./Providers/AuthCredentialsProvider";


export interface AuthCredentialsState {
    userAuth: UserAuth | null;
    userCredentialsCurrent: UserCredentials | null;
    userCredentialsList: UserCredentials[] | null;
    saveUserCredentials: (userCredentials: UserCredentials) => Promise<void>;
    removeUserCredentials: (uc: UserCredentials) => Promise<void>;
    saveUserAuth: (userAuth: UserAuth) => Promise<void>;
    removeUserAuth: () => Promise<void>;
    authCredentials: AuthCredentials | null;
    saveCredentials: (ac: AuthCredentials) => Promise<void>;
    removeCredentials: () => Promise<void>;
    switchUserCredentials: (userCredentials: UserCredentials) => Promise<void>;
    isLoading: boolean;
}

export function useAuthCredentialsService(): AuthCredentialsState {
    const context = useContext(AuthCredentialsContext)

    if (!context) {
        throw new Error('AUthCredentials should be used within a AuthCredentialsProvider')
    }

    return context
}

