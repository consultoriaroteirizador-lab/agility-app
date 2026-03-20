import { useCallback, useEffect, useRef, useState } from 'react';

import * as LocalAuthentication from 'expo-local-authentication';

import { useAuthSignIn } from '@/domain/Auth/useCases/useAuthSignIn';
import { goHomeScreen } from '@/routes';
import { useAuthCredentialsService, useTenantService } from '@/services';

interface UseBiometricAuthParams {
    deviceId: string | null;
}

export function useBiometricAuth({ deviceId }: UseBiometricAuthParams) {
    const { userCredentialsCurrent, isLoading: isLoadingCredentials } = useAuthCredentialsService();
    const { tenantInfo } = useTenantService();

    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const isAuthenticatedRef = useRef(false);

    const resetAuthState = useCallback(() => {
        console.log('[Biometric] resetAuthState chamado');
        setIsAuthenticating(false);
        isAuthenticatedRef.current = false;
    }, []);

    const { signIn, isLoading: isLoadingSignIn } = useAuthSignIn({
        onError: (error) => {
            console.error('[Biometric] auth error:', error);
            setIsAuthenticating(false);
        },
        onSuccess: async () => {
            console.log('[Biometric] useAuthSignIn onSuccess - login biométrico bem-sucedido');
            // Login biométrico bem-sucedido - navegar para home
            // O allowsBiometrics já deve ser true pois veio das credenciais salvas
            console.log('[Biometric] Navegando para HomeScreen');
            goHomeScreen();
        },
    });

    useEffect(() => {
        console.log('[Biometric] useEffect disparado');
        console.log('[Biometric] isAuthenticating:', isAuthenticating);
        console.log('[Biometric] isAuthenticatedRef.current:', isAuthenticatedRef.current);
        console.log('[Biometric] isLoadingCredentials:', isLoadingCredentials);
        console.log('[Biometric] deviceId:', deviceId);
        console.log('[Biometric] userCredentialsCurrent:', userCredentialsCurrent ? 'existe' : 'null');
        console.log('[Biometric] allowsBiometrics:', userCredentialsCurrent?.allowsBiometrics);
        console.log('[Biometric] hasPassword:', !!userCredentialsCurrent?.password);

        // Prevenir múltiplas chamadas simultâneas ou após autenticação bem-sucedida
        if (isAuthenticating || isAuthenticatedRef.current) return;
        if (isLoadingCredentials) return;
        if (!deviceId) return; // Aguardar deviceId estar disponível
        if (!userCredentialsCurrent?.allowsBiometrics) return;
        if (!userCredentialsCurrent.password) return;

        console.log('[Biometric] Todas condições atendidas, chamando handleAuthenticationBiometric');
        handleAuthenticationBiometric();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId, userCredentialsCurrent, isLoadingCredentials, isAuthenticating]);

    async function handleAuthenticationBiometric() {
        console.log('[Biometric] handleAuthenticationBiometric chamado');
        setIsAuthenticating(true);

        try {
            const compatible = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            console.log('[Biometric] compatible:', compatible);
            console.log('[Biometric] isEnrolled:', isEnrolled);

            if (!compatible || !isEnrolled) {
                console.log('[Biometric] Dispositivo não compatível ou biometria não cadastrada');
                setIsAuthenticating(false);
                return;
            }

            console.log('[Biometric] Chamando authenticateAsync');
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Autentique-se para continuar',
                fallbackLabel: 'Usar senha',
                cancelLabel: 'Cancelar',
            });

            console.log('[Biometric] authenticateAsync result:', result);

            if (result.success) {
                console.log('[Biometric] autenticação bem-sucedida, chamando signIn');
                isAuthenticatedRef.current = true;
                signIn({
                    emailOrUsername: userCredentialsCurrent!.username!,
                    password: userCredentialsCurrent!.password!,
                    tenantCode: tenantInfo?.tenantCode,
                });
                console.log('[Biometric] signIn chamado');
            } else {
                console.log('[Biometric] Autenticação cancelada ou falhou');
                setIsAuthenticating(false);
            }
        } catch (error) {
            console.error('[Biometric] Erro na autenticação:', error);
            setIsAuthenticating(false);
        }
    }

    return {
        handleAuthenticationBiometric,
        isAuthenticating: isAuthenticating || isLoadingSignIn,
        isDeviceIdReady: !!deviceId,
        resetAuthState,
    };
}
