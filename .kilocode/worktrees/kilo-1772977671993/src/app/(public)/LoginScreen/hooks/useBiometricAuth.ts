import { useEffect } from 'react';

import * as LocalAuthentication from 'expo-local-authentication';

import { useAuthCredentialsService } from '@/services';

interface UseBiometricAuthParams {
    deviceId: string | null;
    signIn: (params: { username: string; password: string; deviceId: string }) => void;
}

export function useBiometricAuth({ deviceId, signIn }: UseBiometricAuthParams) {
    const { userCredentialsCurrent, isLoading } = useAuthCredentialsService();

    async function handleAuthenticationBiometric() {
        if (!userCredentialsCurrent?.allowsBiometrics || !userCredentialsCurrent.password || !deviceId) return;

        const compatible = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!compatible || !isEnrolled) return;

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Autentique-se para continuar',
            fallbackLabel: 'Biometria não reconhecida',
        });

        if (result.success) {
            signIn({
                username: userCredentialsCurrent.username!,
                password: userCredentialsCurrent.password!,
                deviceId,
            });
        }
    }

    useEffect(() => {
        // Aguarda o carregamento dos dados e verifica se tudo está pronto
        if (!isLoading && deviceId && userCredentialsCurrent?.allowsBiometrics) {
            handleAuthenticationBiometric();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [deviceId, userCredentialsCurrent, isLoading]);

    return {
        handleAuthenticationBiometric,
    };
}
