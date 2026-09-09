import { useCallback, useState } from 'react';

import { authService } from '@/domain/Auth/authService';
import { useAuthCredentialsService, useTenantService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';

import { needsPasswordToActivate, resolveActivationError } from '../_utils/biometricActivation';

/**
 * Liga e desliga o login por digital.
 *
 * Desligar e ligar-com-senha-em-mãos são gravações diretas. Ligar SEM a senha
 * (o caso de quem reabriu o app) abre um pedido de confirmação: a senha digitada
 * é conferida contra o `/auth/login` antes de ser guardada.
 *
 * Por que conferir em vez de só guardar o que foi digitado: uma senha errada
 * gravada aqui só falharia no próximo login, longe da causa, e o motorista veria
 * a digital "ativada" recusando a entrada dele.
 *
 * Os tokens que a conferência devolve são ADOTADOS (`saveCredentials` silencioso)
 * em vez de descartados — a sessão segue com credenciais novas, e o `silent`
 * evita que o `_layout` troque a árvore do app pelo spinner de boot no meio de
 * uma ação de menu.
 */
export function useBiometricActivation() {
    const { userCredentialsCurrent, saveUserCredentials, saveCredentials } = useAuthCredentialsService();
    const { tenantInfo } = useTenantService();
    const { showToast } = useToastService();

    const [isSaving, setIsSaving] = useState(false);
    const [isPrompting, setIsPrompting] = useState(false);
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const toggle = useCallback(async () => {
        if (!userCredentialsCurrent) return;

        if (needsPasswordToActivate(userCredentialsCurrent)) {
            setPassword('');
            setErrorMessage(undefined);
            setIsPrompting(true);
            return;
        }

        setIsSaving(true);
        try {
            await saveUserCredentials({
                ...userCredentialsCurrent,
                allowsBiometrics: !userCredentialsCurrent.allowsBiometrics,
            });
        } catch {
            showToast({ message: 'Não foi possível atualizar a configuração de biometria', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    }, [userCredentialsCurrent, saveUserCredentials, showToast]);

    const cancelPrompt = useCallback(() => {
        setIsPrompting(false);
        setPassword('');
        setErrorMessage(undefined);
    }, []);

    const confirmPassword = useCallback(async () => {
        if (!userCredentialsCurrent || !password) return;

        setIsSaving(true);
        setErrorMessage(undefined);
        try {
            const response = await authService.signIn({
                emailOrUsername: userCredentialsCurrent.username,
                password,
                tenantCode: tenantInfo?.tenantCode,
            });

            if (response.result) {
                await saveCredentials(response.result, { silent: true });
            }

            await saveUserCredentials({
                ...userCredentialsCurrent,
                password,
                allowsBiometrics: true,
            });

            setIsPrompting(false);
            setPassword('');
            showToast({ message: 'Login com biometria ativado.', type: 'success' });
        } catch (error) {
            setErrorMessage(resolveActivationError(error));
        } finally {
            setIsSaving(false);
        }
    }, [userCredentialsCurrent, password, tenantInfo, saveCredentials, saveUserCredentials, showToast]);

    return {
        isSaving,
        isPrompting,
        password,
        setPassword,
        errorMessage,
        toggle,
        confirmPassword,
        cancelPrompt,
    };
}
