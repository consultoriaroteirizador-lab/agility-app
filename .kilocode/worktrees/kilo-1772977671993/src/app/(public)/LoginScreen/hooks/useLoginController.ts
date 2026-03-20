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
        userAuth,
    } = useAuthCredentialsService();

    const { deviceId } = useNotification();
    const { tenantInfo, saveTenant } = useTenantService();

    const [messageError, setMessageError] = useState<string | undefined>();
    const [showMultipleAccounts, setShowMultipleAccounts] = useState(false);
    const [isEmailField, setIsEmailField] = useState(false);
    const [password, setPassword] = useState<string>('');
    const [tenantCode, setTenantCode] = useState<string>('');

    const [errorTrigger, setErrorTrigger] = useState(0);
    const [hasAttemptedBiometric, setHasAttemptedBiometric] = useState(false);

    useEffect(() => {
        if (deviceId) {
            setHasAttemptedBiometric(false);
        }
    }, [deviceId]);

    const { signIn, isLoading: isLoadingSignIn } = useAuthSignIn({
        onError: (error) => {
            setMessageError(error.error?.message ?? 'Houve um erro no seu processamento');
            setErrorTrigger(Date.now());
        },
        onSuccess: async (result) => {
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Salvar tenant info apos login bem-sucedido
            if (tenantCode) {
                await saveTenant({ tenantCode });
            }
            
            if (userAuth) {
                const userEmail = userAuth.email || userAuth.taxNumber; // Fallback para taxNumber se email não estiver disponível
                await saveUserCredentials({
                    name: userAuth.fullname,
                    alias: userAuth.nickname,
                    username: userEmail,
                    password,
                    allowsBiometrics: isEmailField ? false : (userCredentialsCurrent ? userCredentialsCurrent.allowsBiometrics : false),
                });
            }
        },
    });


    

    function handleSubmitForm({ tenantCode, email, password }: FormLoginSchema) {
        setTenantCode(tenantCode);
        setPassword(password);
        const user = !isEmailField && userCredentialsCurrent
            ? userCredentialsCurrent.username!
            : email;

        signIn({ emailOrUsername: user, password, tenantCode});
    }

    useEffect(() => {
        async function handleAuthenticationBiometric() {
            if (hasAttemptedBiometric) return;

            if (isLoadingCredentials) return;

            if (!userCredentialsCurrent || !userCredentialsCurrent.allowsBiometrics || !userCredentialsCurrent.password || !deviceId) {
                return;
            }

            setHasAttemptedBiometric(true);

            const compatible = await LocalAuthentication.hasHardwareAsync();
            const isEnrolled = await LocalAuthentication.isEnrolledAsync();

            if (!compatible || !isEnrolled) {
                return;
            }

            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Autentique-se para continuar',
                fallbackLabel: 'Biometria não reconhecida',
            });

            if (result.success) {
                setPassword(userCredentialsCurrent.password);
                signIn({
                    emailOrUsername: userCredentialsCurrent.username!,
                    password: userCredentialsCurrent.password!,
                    tenantCode: tenantInfo?.tenantCode,
                });
            }
        }
        handleAuthenticationBiometric();
    }, [isLoadingCredentials, userCredentialsCurrent, deviceId, hasAttemptedBiometric, signIn, tenantInfo]);

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
