import { createContext, PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";


import { apiAgility, apiIdentity } from "@/api";
import { isDevelopment } from "@/config/environment";
import { mapCollaboratorToUserAuth } from "@/domain/agility/collaborator/collaboratorMapper";
import { collaboratorService } from "@/domain/agility/collaborator/collaboratorService";
import { authService } from "@/domain/Auth/authService";
import { AuthCredentials } from "@/domain/Auth/authType";
import { goLoginScreen } from "@/routes";
import { UserAuth, UserCredentials } from "@/services/userAuthInfo/UserAuthInfoType";

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
    saveCredentials: async () => { },
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
        if (userCredentialsCurrent?.username === uc.username) {
            await userCredentialsStorage.removeCurrent();
            setUserCredentialsCurrent(null);
        }
        await refreshUserCredentialsList();
    }, [userCredentialsCurrent, refreshUserCredentialsList]);

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

    const saveCredentials = useCallback(async (ac: AuthCredentials): Promise<void> => {
        setIsLoading(true);
        const wasAuthenticated = !!authCredentials;
        
        // Update token first so profile API call can use it
        authService.updateToken(ac.accessToken, ac.tenantId);
        setAuthCredentials(ac);
        
        try {
            // Get user profile from backend instead of decoding JWT
            const profileResponse = await collaboratorService.getProfile();
            if (profileResponse.success && profileResponse.result) {
                // Use userStatus from login response if available (for temporary password detection)
                const userAuth = mapCollaboratorToUserAuth(profileResponse.result, ac.userStatus);
                setUserAuth(userAuth);
                await saveUserAuth(userAuth);
            } else {
                throw new Error(profileResponse.message || 'Failed to get user profile');
            }
        } catch (error: any) {
            const status = error?.response?.status;
            let errorMessage = 'Erro ao obter perfil do usuário';

            if (status === 403) {
                errorMessage = 'Você não tem permissão para acessar esta conta. Entre em contato com o administrador.';
            } else if (status === 404) {
                errorMessage = 'Perfil de usuário não encontrado. Sua conta pode não estar configurada corretamente.';
            } else if (status === 401) {
                errorMessage = 'Sessão expirada. Por favor, faça login novamente.';
            }

            if (isDevelopment) {
                console.error('[AuthCredentialsProvider] Error getting profile:', error, 'Status:', status);
            }

            // Create a more descriptive error with user-friendly message
            const enhancedError = new Error(errorMessage);
            (enhancedError as any).originalError = error;
            (enhancedError as any).status = status;
            
            // If profile fetch fails, still save credentials but without userAuth
            // This allows retry later
            throw enhancedError;
        }
        
        // Limpar o Set apenas quando é um novo login completo (não havia credenciais antes)
        // Para refresh tokens, manter o Set para evitar loops com requisições que continuam falhando
        if (!wasAuthenticated) {
            failedRequestsAfterRefreshRef.current.clear();
        }
        isRedirectingRef.current = false;
        setIsLoading(false);
    }, [saveUserAuth, authCredentials]);

    const removeCredentials = useCallback(async (): Promise<void> => {
        // Limpar primeiro authCredentials para evitar que interceptors tentem refresh token
        setAuthCredentials(null);
        authService.removeToken();
        await removeUserAuth();
        // Limpar o Set e flag de redirecionamento ao fazer logout
        failedRequestsAfterRefreshRef.current.clear();
        isRedirectingRef.current = false;
        refreshTokenPromiseRef.current = null;
        // Usar goLoginScreen() que tem try/catch para evitar erros de redirecionamento
        goLoginScreen();
    }, [removeUserAuth]);

    const startAuthCredentials = useCallback(async () => {
        try {
            if (!authCredentials) {
                setIsLoading(false);
                return;
            }
            
            // If we have authCredentials but no userAuth, fetch profile from backend
            // This can happen after app restart when credentials are loaded but userAuth was not persisted
            if (!userAuth) {
                if (isDevelopment) console.log('[Auth] Credentials found but no userAuth, fetching profile...');
                try {
                    authService.updateToken(authCredentials.accessToken, authCredentials.tenantId);
                    const profileResponse = await collaboratorService.getProfile();
                    if (profileResponse.success && profileResponse.result) {
                        const mappedUserAuth = mapCollaboratorToUserAuth(profileResponse.result);
                        setUserAuth(mappedUserAuth);
                        await saveUserAuth(mappedUserAuth);
                    }
                } catch (profileError) {
                    if (isDevelopment) console.log('[Auth] Failed to fetch profile on start:', profileError);
                    // Continue with token validation even if profile fetch fails
                }
            }
            
            let { expiration, expirationRefreshToken } = authCredentials;
            expiration = new Date(expiration);
            expirationRefreshToken = new Date(expirationRefreshToken);
            const currentTime = new Date();

            if (isNaN(expiration.getTime()) || isNaN(expirationRefreshToken.getTime())) {
                throw new Error("Datas de expiração inválidas");
            }

            const remainingTimeAccessToken = expiration.getTime() - currentTime.getTime();
            const remainingTimeRefreshToken = expirationRefreshToken.getTime() - currentTime.getTime();

            if (remainingTimeAccessToken <= 0) {
                // For refresh token, we need userAuth.taxNumber
                // If userAuth is still not available, try to get it from profile first
                let currentUserAuth = userAuth;
                if (!currentUserAuth?.taxNumber && authCredentials.accessToken) {
                    if (isDevelopment) console.log('[Auth] No userAuth for refresh, fetching profile...');
                    try {
                        authService.updateToken(authCredentials.accessToken, authCredentials.tenantId);
                        const profileResponse = await collaboratorService.getProfile();
                        if (profileResponse.success && profileResponse.result) {
                            currentUserAuth = mapCollaboratorToUserAuth(profileResponse.result);
                            setUserAuth(currentUserAuth);
                            await saveUserAuth(currentUserAuth);
                        }
                    } catch (profileError) {
                        if (isDevelopment) console.log('[Auth] Failed to fetch profile for refresh:', profileError);
                    }
                }
                
                if (remainingTimeRefreshToken > 0 && authCredentials.refreshToken && currentUserAuth?.taxNumber) {
                    if (isDevelopment) console.log('[Auth] Access token expirado, tentando refresh...');
                    try {
                        const newAuthCredentials = await authService.refreshToken(
                            authCredentials.refreshToken,
                            currentUserAuth.taxNumber
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
            
            authService.updateToken(authCredentials.accessToken, authCredentials.tenantId);
        } catch (error) {
            if (isDevelopment) console.error("Erro ao iniciar credenciais de autenticação:", error);
            goLoginScreen();
        } finally {
            setIsLoading(false);
        }
    }, [authCredentials, removeCredentials, saveCredentials, saveUserAuth, userAuth]);

    useEffect(() => {
        handleUserCredentials();
        startAuthCredentials();
    }, [handleUserCredentials, startAuthCredentials]);

    const failedRequestsAfterRefreshRef = useRef<Set<string>>(new Set());
    const isRedirectingRef = useRef(false);
    const refreshTokenPromiseRef = useRef<Promise<AuthCredentials | null> | null>(null);

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
                    
                    // Rotas públicas (x-api-key sem Authorization) não precisam de token
                    // Rotas de refresh também não devem tentar refresh token novamente
                    // 401 significa erro de autenticação/autorização, não token expirado
                    if (responseError.skipRefreshToken || (hasApiKey && !hasAuthHeader)) {
                        if (isDevelopment) {
                            console.log('[Auth Interceptor] 401 em rota pública (x-api-key sem Authorization):', failedRequestUrl, '- deixando caller tratar (erro de autenticação, não token)');
                        }
                        // Se é rota de refresh que falhou, significa que refresh token expirou
                        if (isRefreshRoute && !isRedirectingRef.current) {
                            if (isDevelopment) console.log('[Auth Interceptor] Refresh token expirou, redirecionando para login');
                            isRedirectingRef.current = true;
                            await removeCredentials();
                        }
                        return Promise.reject(responseError);
                    }
                    
                    // Se esta requisição já falhou após refresh token, não tentar novamente (evitar loop)
                    if (failedRequestsAfterRefreshRef.current.has(requestKey)) {
                        if (isDevelopment) console.log('[Auth Interceptor] Requisição já falhou após refresh, rejeitando para evitar loop:', failedRequestUrl);
                        return Promise.reject(responseError);
                    }
                    
                    // Verificar se já está redirecionando para evitar múltiplos redirects
                    if (isRedirectingRef.current) {
                        if (isDevelopment) console.log('[Auth Interceptor] Já redirecionando, rejeitando requisição');
                        return Promise.reject(responseError);
                    }
                    
                    // Só tenta refresh token se a requisição tem Authorization header (rota autenticada)
                    // Se não tem Authorization, é rota pública e não deve tentar refresh
                    if (!hasAuthHeader) {
                        if (isDevelopment) console.log('[Auth Interceptor] 401 sem token na requisição (rota pública), deixando caller tratar');
                        return Promise.reject(responseError);
                    }
                    
                    // Se não tem refresh token disponível, vai para login
                    if (!authCredentials?.refreshToken) {
                        if (isDevelopment) console.log('[Auth Interceptor] Sem refresh token disponível, redirecionando para login');
                        isRedirectingRef.current = true;
                        await removeCredentials();
                        return Promise.reject(responseError);
                    }
                    
                    // Se já está fazendo refresh token, aguardar a mesma Promise e retentar
                    if (refreshTokenPromiseRef.current) {
                        if (isDevelopment) console.log('[Auth Interceptor] Refresh token já em andamento, aguardando...');
                        try {
                            const newAuthCredentials = await refreshTokenPromiseRef.current;
                            if (newAuthCredentials) {
                                const failedRequest = responseError.config;
                                failedRequest.headers.Authorization = `Bearer ${newAuthCredentials.accessToken}`;
                                return await apiInstance(failedRequest);
                            }
                        } catch {
                            // Se o refresh falhou, rejeitar a requisição
                            return Promise.reject(responseError);
                        }
                        return Promise.reject(responseError);
                    }
                    
                    
                    const currentAuthCredentials = authCredentials;
                    const currentUserAuth = userAuth;
                    if (!currentAuthCredentials?.refreshToken || !currentUserAuth?.taxNumber) {
                        if (isDevelopment) console.log('[Auth Interceptor] Credenciais não disponíveis para refresh token (possível logout em andamento)');
                        return Promise.reject(responseError);
                    }
                    
                    const refreshPromise = (async () => {
                        try {
                            if (isDevelopment) console.log('[Auth Interceptor] Token expirado detectado, tentando refresh token...');
                            const newAuthCredentials = await authService.refreshToken(currentAuthCredentials.refreshToken, currentUserAuth.taxNumber);
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
                        
                        // Se a retentativa foi bem-sucedida, limpar o Set e a Promise para permitir novas tentativas
                        failedRequestsAfterRefreshRef.current.delete(requestKey);
                        refreshTokenPromiseRef.current = null;
                        isRedirectingRef.current = false;
                        return retryResponse;
                    } catch (refreshError: any) {
                        // Limpar a Promise de refresh token para permitir nova tentativa no futuro
                        refreshTokenPromiseRef.current = null;
                        
                        // Se a retentativa após refresh falhou com 401, marcar para não tentar novamente (evitar loop)
                        if (refreshError?.response?.status === 401 || refreshError?.config?.url === failedRequestUrl) {
                            failedRequestsAfterRefreshRef.current.add(requestKey);
                            if (isDevelopment) console.log('[Auth Interceptor] Retentativa falhou com 401, marcando requisição para evitar loop:', failedRequestUrl);
                        }
                        
                        if (isDevelopment) console.log('[Auth Interceptor] Refresh token falhou ou retentativa falhou, redirecionando para login:', refreshError?.message || refreshError);
                        // Marcar como redirecionando antes para evitar tentativas simultâneas
                        isRedirectingRef.current = true;
                        await removeCredentials();
                        // Retornar o erro original (401) para que o caller veja o erro correto
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
    }, [authCredentials, userAuth, removeCredentials, saveCredentials]);

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