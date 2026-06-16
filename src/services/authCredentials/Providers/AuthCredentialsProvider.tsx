import { createContext, PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";


import { apiAgility, apiIdentity } from "@/api";
import { isDevelopment } from "@/config/environment";
import { authAdapter } from "@/domain/Auth/authAdapter";
import { authService } from "@/domain/Auth/authService";
import { AuthCredentials } from "@/domain/Auth/authType";
import { decodeJWT } from "@/functions/decodeJwt";
import { goLoginScreen } from "@/routes";
import { UserAuth, UserCredentials } from "@/services/userAuthInfo/UserAuthInfoType";
import { EnhancedError } from "@/utils/errors";

import { authCredentialsStorage } from "../authCredentialsStorage";
import { AuthCredentialsState } from "../useAuthCredentialsService";
import { userCredentialsStorage } from "../userCredentialsStorage";

export const AuthCredentialsContext = createContext<AuthCredentialsState>({
    removeUserAuth: async () => { },
    removeUserCredentials: async () => { },
    saveUserAuth: async () => { },
    saveUserCredentials: async () => { },
    userCredentialsCurrent: null,
    userCredentialsList: null,
    userAuth: null,
    authCredentials: null,
    isLoading: false,
    saveCredentials: async () => null,
    removeCredentials: async () => { },
    switchUserCredentials: async () => { },
});

export function AuthCredentialsProvider({ children }: PropsWithChildren) {
    const [authCredentials, setAuthCredentials] = useState<AuthCredentials | null>(null);
    const [userAuth, setUserAuth] = useState<UserAuth | null>(null);
    const [userCredentialsCurrent, setUserCredentialsCurrent] = useState<UserCredentials | null>(null);
    const [userCredentialsList, setUserCredentialsList] = useState<UserCredentials[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const saveUserAuth = useCallback(async (userAuth: UserAuth): Promise<void> => {
        setUserAuth(userAuth);
    }, []);

    const removeUserAuth = useCallback(async (): Promise<void> => {
        setUserAuth(null);
    }, []);

    const refreshUserCredentialsList = useCallback(async () => {
        const list = await userCredentialsStorage.getAll();
        setUserCredentialsList(list);
    }, []);

    const saveUserCredentials = useCallback(async (userCredentials: UserCredentials): Promise<void> => {
        await userCredentialsStorage.setCurrent(userCredentials);
        await userCredentialsStorage.setInAll(userCredentials);
        setUserCredentialsCurrent(userCredentials);
        await refreshUserCredentialsList();
        setIsLoading(false);
    }, [refreshUserCredentialsList]);

    const removeUserCredentials = useCallback(async (uc: UserCredentials): Promise<void> => {
        await userCredentialsStorage.remove(uc);
        // Ler o "current" do storage para evitar dependência circular com o state
        // userCredentialsCurrent — que recriaria este callback a cada mudança e
        // dispararia efeitos em cascata em quem o usa em deps.
        const current = await userCredentialsStorage.getCurrent();
        if (current?.username === uc.username) {
            await userCredentialsStorage.removeCurrent();
            setUserCredentialsCurrent(null);
        }
        await refreshUserCredentialsList();
    }, [refreshUserCredentialsList]);

    const switchUserCredentials = useCallback(async (userCredentials: UserCredentials): Promise<void> => {
        await userCredentialsStorage.setCurrent(userCredentials);
        setUserCredentialsCurrent(userCredentials);
    }, []);

    const getUserCredentialsList = useCallback(async (): Promise<UserCredentials[] | null> => {
        return await userCredentialsStorage.getAll();
    }, []);

    const getUserCredentialsCurrent = useCallback(async (): Promise<UserCredentials | null> => {
        return await userCredentialsStorage.getCurrent();
    }, []);

    const handleUserCredentials = useCallback(async () => {
        const list = await getUserCredentialsList();
        const current = await getUserCredentialsCurrent();
        setUserCredentialsList(list);
        setUserCredentialsCurrent(current);
    }, [getUserCredentialsList, getUserCredentialsCurrent]);

    const saveCredentials = useCallback(async (ac: AuthCredentials): Promise<UserAuth | null> => {
        console.log('[saveCredentials] Iniciando...');
        console.log('[saveCredentials] ac:', ac ? 'existe' : 'null');
        setIsLoading(true);
        const wasAuthenticated = !!authCredentials;

        // Update token so API calls are authenticated
        authService.updateToken(ac.accessToken, ac.tenantId);
        setAuthCredentials(ac);
        await authCredentialsStorage.set(ac);

        try {
            // Decode JWT to extract user info from Keycloak custom claims
            const claims = decodeJWT(ac.accessToken);
            const userAuth = authAdapter.mapTokenClaimsToUserAuth(claims, ac.userStatus);
            setUserAuth(userAuth);
            await saveUserAuth(userAuth);

            // Limpar o Set apenas quando é um novo login completo (não havia credenciais antes)
            if (!wasAuthenticated) {
                failedRequestsAfterRefreshRef.current.clear();
            }
            isRedirectingRef.current = false;
            console.log('[saveCredentials] Finalizado com sucesso via JWT claims');
            return userAuth;
        } catch (error: any) {
            if (isDevelopment) {
                console.error('[AuthCredentialsProvider] Error decoding JWT:', error);
            }

            const enhancedError = new EnhancedError(
                'Erro ao processar dados do login.',
                undefined,
                { originalError: error }
            );

            throw enhancedError;
        } finally {
            // SEMPRE encerra o loading — mesmo se o decode do JWT lançar exceção.
            // Sem isto, uma falha aqui prendia o app no spinner de boot para sempre.
            setIsLoading(false);
        }
    }, [saveUserAuth, authCredentials]);

    const removeCredentials = useCallback(async (): Promise<void> => {
        // Limpar primeiro authCredentials para evitar que interceptors tentem refresh token
        setAuthCredentials(null);
        authService.removeToken();
        await removeUserAuth();
        await authCredentialsStorage.remove();
        // Limpar o Set e flag de redirecionamento ao fazer logout
        failedRequestsAfterRefreshRef.current.clear();
        isRedirectingRef.current = false;
        refreshTokenPromiseRef.current = null;
        // Usar goLoginScreen() que tem try/catch para evitar erros de redirecionamento
        goLoginScreen();
    }, [removeUserAuth]);

    const startAuthCredentials = useCallback(async () => {
        try {
            // Hidratar do storage antes de qualquer decisão; se já temos no state, usar o do state
            const credentials = authCredentials ?? await authCredentialsStorage.get();

            if (!credentials) {
                setIsLoading(false);
                return;
            }

            // If we have authCredentials but no userAuth, decode JWT to populate userAuth
            // This can happen after app restart when credentials are loaded from storage
            if (!userAuth) {
                if (isDevelopment) console.log('[Auth] Credentials found but no userAuth, decoding JWT...');
                try {
                    const claims = decodeJWT(credentials.accessToken);
                    const mappedUserAuth = authAdapter.mapTokenClaimsToUserAuth(claims);
                    setUserAuth(mappedUserAuth);
                    await saveUserAuth(mappedUserAuth);
                } catch (decodeError) {
                    if (isDevelopment) console.log('[Auth] Failed to decode JWT on start:', decodeError);
                    // If JWT decode fails (e.g. token corrupted), try to refresh
                }
            }

            const expirationDate = new Date(credentials.expiration);
            const expirationRefreshTokenDate = new Date(credentials.expirationRefreshToken);
            const currentTime = new Date();

            if (isNaN(expirationDate.getTime()) || isNaN(expirationRefreshTokenDate.getTime())) {
                throw new Error("Datas de expiração inválidas");
            }

            const remainingTimeAccessToken = expirationDate.getTime() - currentTime.getTime();
            const remainingTimeRefreshToken = expirationRefreshTokenDate.getTime() - currentTime.getTime();

            if (remainingTimeAccessToken <= 0) {
                if (remainingTimeRefreshToken > 0 && credentials.refreshToken) {
                    if (isDevelopment) console.log('[Auth] Access token expirado, tentando refresh...');
                    try {
                        const newAuthCredentials = await authService.refreshToken(
                            credentials.refreshToken,
                            credentials.tenantId,
                        );
                        if (isDevelopment) console.log('[Auth] Refresh bem sucedido no boot');
                        await saveCredentials(newAuthCredentials);
                        return;
                    } catch (refreshError) {
                        if (isDevelopment) console.log('[Auth] Refresh falhou no boot:', refreshError);
                        await removeCredentials();
                        throw new Error('Refresh token falhou, redirecionando para login.');
                    }
                } else {
                    if (isDevelopment) console.log('[Auth] Refresh token também expirado ou indisponível');
                    await removeCredentials();
                    throw new Error('Token expirado, redirecionando para login.');
                }
            }

            authService.updateToken(credentials.accessToken, credentials.tenantId);

            // Se hidratou do storage, popular o state agora que validamos
            if (!authCredentials) {
                setAuthCredentials(credentials);
            }
        } catch (error) {
            if (isDevelopment) console.error("Erro ao iniciar credenciais de autenticação:", error);
            goLoginScreen();
        } finally {
            setIsLoading(false);
        }
    }, [authCredentials, removeCredentials, saveCredentials, saveUserAuth, userAuth]);

    // Bootstrap único e ordenado: handleUserCredentials carrega o
    // userCredentialsCurrent (com a flag allowsBiometrics) e PRECISA terminar
    // antes do startAuthCredentials porque este último libera `isLoading=false`
    // — o que dispara a navegação inicial no _layout. Se rodam em paralelo, o
    // boot decide pelo userCredentialsCurrent=null e mandava sempre pra tela
    // de biometria, mesmo com a flag já persistida.
    const bootstrappedRef = useRef(false);
    useEffect(() => {
        if (bootstrappedRef.current) return;
        bootstrappedRef.current = true;
        (async () => {
            await handleUserCredentials();
            await startAuthCredentials();
        })();
    }, [handleUserCredentials, startAuthCredentials]);

    const failedRequestsAfterRefreshRef = useRef<Set<string>>(new Set());
    const isRedirectingRef = useRef(false);
    const refreshTokenPromiseRef = useRef<Promise<AuthCredentials | null> | null>(null);
    const authCredentialsRef = useRef<AuthCredentials | null>(null);

    // Mantém a ref sincronizada com o estado
    useEffect(() => {
        authCredentialsRef.current = authCredentials;
    }, [authCredentials]);

    useEffect(() => {
        const apis = [
            apiAgility,
            apiIdentity
        ];

        const create401Handler = (apiInstance: typeof apiAgility) => {
            return async (responseError: any) => {
                const status = responseError.response?.status;

                if (status === 401) {
                    const failedRequestUrl = responseError.config?.url || '';
                    const requestKey = `${responseError.config?.method || ''}_${failedRequestUrl}`;
                    const isRefreshRoute = failedRequestUrl.includes('/auth/refresh-token');
                    const hasApiKey = !!responseError.config?.headers?.['x-api-key'];
                    const hasAuthHeader = !!responseError.config?.headers?.Authorization;

                    if (isDevelopment) {
                        console.log('[Auth Interceptor] 401 recebido:', {
                            url: failedRequestUrl,
                            method: responseError.config?.method,
                            hasApiKey,
                            hasAuthHeader,
                            skipRefreshToken: responseError.skipRefreshToken,
                            isRefreshRoute
                        });
                    }

                    // Rotas públicas (x-api-key sem Authorization) não tentam refresh
                    if (responseError.skipRefreshToken || (hasApiKey && !hasAuthHeader)) {
                        if (isDevelopment) {
                            console.log('[Auth Interceptor] 401 em rota pública:', failedRequestUrl);
                        }
                        if (isRefreshRoute && !isRedirectingRef.current) {
                            if (isDevelopment) console.log('[Auth Interceptor] Refresh token expirou, redirecionando para login');
                            isRedirectingRef.current = true;
                            await removeCredentials();
                        }
                        return Promise.reject(responseError);
                    }

                    // Se esta requisição já falhou após refresh token, não tentar novamente
                    if (failedRequestsAfterRefreshRef.current.has(requestKey)) {
                        if (isDevelopment) console.log('[Auth Interceptor] Requisição já falhou após refresh:', failedRequestUrl);
                        return Promise.reject(responseError);
                    }

                    // Verificar se já está redirecionando
                    if (isRedirectingRef.current) {
                        if (isDevelopment) console.log('[Auth Interceptor] Já redirecionando, rejeitando');
                        return Promise.reject(responseError);
                    }

                    // Rota autenticada sem Authorization header - não tenta refresh
                    if (!hasAuthHeader) {
                        if (isDevelopment) console.log('[Auth Interceptor] 401 sem Authorization header');
                        return Promise.reject(responseError);
                    }

                    // Pegar credenciais sempre atualizadas via ref
                    const currentCredentials = authCredentialsRef.current;

                    // Se não tem refresh token disponível, vai para login
                    if (!currentCredentials?.refreshToken) {
                        if (isDevelopment) console.log('[Auth Interceptor] Sem refresh token disponível, redirecionando para login');
                        isRedirectingRef.current = true;
                        await removeCredentials();
                        return Promise.reject(responseError);
                    }

                    // Verificar validade do refresh token antes de tentar
                    const refreshTokenExpiration = new Date(currentCredentials.expirationRefreshToken);
                    const isRefreshTokenValid = refreshTokenExpiration.getTime() > Date.now();

                    if (!isRefreshTokenValid) {
                        if (isDevelopment) console.log('[Auth Interceptor] Refresh token expirado, redirecionando para login');
                        isRedirectingRef.current = true;
                        await removeCredentials();
                        return Promise.reject(responseError);
                    }

                    // Se já está fazendo refresh token, aguardar a mesma Promise e retentar
                    if (refreshTokenPromiseRef.current) {
                        if (isDevelopment) console.log('[Auth Interceptor] Refresh já em andamento, aguardando...');
                        try {
                            const newAuthCredentials = await refreshTokenPromiseRef.current;
                            if (newAuthCredentials) {
                                const failedRequest = responseError.config;
                                failedRequest.headers.Authorization = `Bearer ${newAuthCredentials.accessToken}`;
                                return await apiInstance(failedRequest);
                            }
                        } catch {
                            return Promise.reject(responseError);
                        }
                        return Promise.reject(responseError);
                    }

                    const refreshPromise = (async () => {
                        try {
                            if (isDevelopment) console.log('[Auth Interceptor] Tentando refresh token...');
                            const newAuthCredentials = await authService.refreshToken(
                                currentCredentials.refreshToken,
                                currentCredentials.tenantId,
                            );
                            if (isDevelopment) console.log('[Auth Interceptor] Refresh token bem sucedido');
                            await saveCredentials(newAuthCredentials);
                            return newAuthCredentials;
                        } catch (error) {
                            refreshTokenPromiseRef.current = null;
                            throw error;
                        }
                    })();

                    refreshTokenPromiseRef.current = refreshPromise;

                    try {
                        const failedRequest = responseError.config;
                        const newAuthCredentials = await refreshPromise;
                        failedRequest.headers.Authorization = `Bearer ${newAuthCredentials.accessToken}`;

                        const retryResponse = await apiInstance(failedRequest);

                        failedRequestsAfterRefreshRef.current.delete(requestKey);
                        refreshTokenPromiseRef.current = null;
                        isRedirectingRef.current = false;
                        return retryResponse;
                    } catch (refreshError: any) {
                        refreshTokenPromiseRef.current = null;

                        if (refreshError?.response?.status === 401 || refreshError?.config?.url === failedRequestUrl) {
                            failedRequestsAfterRefreshRef.current.add(requestKey);
                            if (isDevelopment) console.log('[Auth Interceptor] Retentativa falhou com 401:', failedRequestUrl);
                        }

                        if (isDevelopment) console.log('[Auth Interceptor] Refresh falhou, redirecionando para login:', refreshError?.message || refreshError);
                        isRedirectingRef.current = true;
                        await removeCredentials();
                        return Promise.reject(responseError);
                    }
                }
                return Promise.reject(responseError);
            };
        };

        const interceptors = apis.map(api => ({
            api,
            id: api.interceptors.response.use(
                (response) => response,
                create401Handler(api)
            )
        }));

        return () => {
            interceptors.forEach(({ api, id }) => {
                api.interceptors.response.eject(id);
            });
        };
    }, [removeCredentials, saveCredentials]);

    return (
        <AuthCredentialsContext.Provider value={{
            userCredentialsList,
            authCredentials,
            isLoading,
            saveCredentials,
            removeCredentials,
            removeUserAuth,
            saveUserAuth,
            userAuth,
            userCredentialsCurrent,
            saveUserCredentials,
            removeUserCredentials,
            switchUserCredentials,
        }}>
            {children}
        </AuthCredentialsContext.Provider>
    );
}
