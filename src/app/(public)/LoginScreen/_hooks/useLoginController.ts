// src/screens/Login/hooks/useLoginController.ts
import { useEffect, useState } from 'react';

import * as LocalAuthentication from 'expo-local-authentication';

import { useAuthSignIn } from '@/domain/Auth/useCases/useAuthSignIn';
import { FormLoginSchema } from '@/formValidate/formLoginSchema';
import { useAuthCredentialsService, useNotification, useTenantService } from '@/services';

export function useLoginController() {
    const {
        userCredentialsCurrent,
        userCredentialsList,
        isLoading: isLoadingCredentials,
        saveUserCredentials,
        removeUserCredentials,
    } = useAuthCredentialsService();

    const { deviceId } = useNotification();
    const { tenantInfo, saveTenant } = useTenantService();

    const [messageError, setMessageError] = useState<string | undefined>();
    const [showMultipleAccounts, setShowMultipleAccounts] = useState(false);
    const [isEmailField, setIsEmailField] = useState(false);
    const [password, setPassword] = useState<string>('');
    const [tenantCode, setTenantCode] = useState<string>('');
    const [email, setEmail] = useState<string>('');

    const [errorTrigger, setErrorTrigger] = useState(0);
    const [hasAttemptedBiometric, setHasAttemptedBiometric] = useState(false);

    // Reset biometric flag when deviceId changes
    useEffect(() => {
        if (deviceId) {
            setHasAttemptedBiometric(false);
        }
    }, [deviceId]);

    // Quando as credenciais terminarem de carregar e houver um usuário salvo,
    // garantir que isEmailField seja false para mostrar o card
    useEffect(() => {
        if (isLoadingCredentials) return;

        if (userCredentialsCurrent && userCredentialsList && userCredentialsList.length > 0) {
            setIsEmailField(false);
        }
    }, [isLoadingCredentials, userCredentialsCurrent, userCredentialsList]);

    const { signIn, isLoading: isLoadingSignIn } = useAuthSignIn({
        onError: (error) => {
            setMessageError(error.error?.message ?? 'Houve um erro no seu processamento');
            setErrorTrigger(Date.now());
        },
        onSuccess: async (data, userAuthFromProfile) => {
            console.log('[LoginController] onSuccess chamado');
            console.log('[LoginController] userAuthFromProfile:', userAuthFromProfile?.fullname || 'null');

            // Salvar tenant info apos login bem-sucedido
            if (tenantCode) {
                await saveTenant({ tenantCode });
            }

            // Usar email do state ou das credenciais salvas
            const userEmail = email || userCredentialsCurrent?.username;
            // Usar password do state ou das credenciais salvas (para login biométrico)
            const userPassword = password || userCredentialsCurrent?.password;

            console.log('[LoginController] userEmail:', userEmail);
            console.log('[LoginController] userPassword:', userPassword ? 'definida' : 'vazia');

            if (userEmail && userPassword) {
                // Manter allowsBiometrics atual se existir
                // Se não existir (primeiro login), deixar undefined para que o _layout
                // redirecione para RegisterAllowsBiometricScreen
                const shouldAllowBiometrics = userCredentialsCurrent?.allowsBiometrics ?? false;

                console.log('[LoginController] shouldAllowBiometrics:', shouldAllowBiometrics);

                // Usar nome do userAuth retornado pelo saveCredentials (que vem do profile)
                const userName = userAuthFromProfile?.fullname || userCredentialsCurrent?.name || '';
                const userAlias = userAuthFromProfile?.nickname || userCredentialsCurrent?.alias || '';

                console.log('[LoginController] userName:', userName);

                await saveUserCredentials({
                    name: userName,
                    alias: userAlias,
                    username: userEmail,
                    password: userPassword,
                    allowsBiometrics: shouldAllowBiometrics,
                });
            }

            // NÃO navegar aqui - deixar o _layout.tsx fazer a navegação
            // baseado no estado de authCredentials e userCredentialsCurrent.allowsBiometrics
        },
    });

    // Biometric authentication logic (like Agility-App)
    useEffect(() => {
        async function handleAuthenticationBiometric() {
            // Prevenir múltiplos prompts
            if (hasAttemptedBiometric) return;

            if (isLoadingCredentials) return;

            // Só tentar biometria se tem credenciais salvas com allowsBiometrics true
            if (!userCredentialsCurrent || !userCredentialsCurrent.allowsBiometrics ||
                !userCredentialsCurrent.password || !deviceId) {
                return;
            }

            setHasAttemptedBiometric(true);
            console.log('[Biometric] Iniciando autenticação biométrica');

            const compatible = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            console.log('[Biometric] compatible:', compatible);
            console.log('[Biometric] isEnrolled:', isEnrolled);

            if (!compatible || !isEnrolled) {
                console.log('[Biometric] Dispositivo não compatível ou biometria não cadastrada');
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Autentique-se para continuar',
                fallbackLabel: 'Usar senha',
                cancelLabel: 'Cancelar',
            });

            console.log('[Biometric] result:', result);

            if (result.success) {
                console.log('[Biometric] Autenticação bem-sucedida, chamando signIn');
                setPassword(userCredentialsCurrent.password);
                signIn({
                    emailOrUsername: userCredentialsCurrent.username!,
                    password: userCredentialsCurrent.password!,
                    tenantCode: tenantInfo?.tenantCode,
                });
            } else {
                console.log('[Biometric] Autenticação cancelada ou falhou');
            }
        }
        handleAuthenticationBiometric();
    }, [isLoadingCredentials, userCredentialsCurrent, deviceId, hasAttemptedBiometric, signIn, tenantInfo]);

    function handleSubmitForm({ tenantCode, email, password }: FormLoginSchema) {
        setTenantCode(tenantCode);
        setPassword(password);
        setEmail(email);
        const user = !isEmailField && userCredentialsCurrent
            ? userCredentialsCurrent.username!
            : email;

        signIn({ emailOrUsername: user, password, tenantCode });
    }

    return {
        // estados
        isLoadingSignIn,
        isLoadingCredentials,
        showMultipleAccounts,
        setShowMultipleAccounts,
        messageError,
        setMessageError,
        isEmailField,
        setIsEmailField,
        errorTrigger,
        // dados
        userCredentialsCurrent,
        userCredentialsList,
        deviceId,
        // actions
        signIn,
        saveUserCredentials,
        removeUserCredentials,
        handleSubmitForm,
    };
}
