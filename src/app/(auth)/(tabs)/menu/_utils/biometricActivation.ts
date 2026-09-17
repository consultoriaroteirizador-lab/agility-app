import type { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';

/**
 * Ligar a digital exige ter a senha em mãos: é ela que o login biométrico
 * reenvia ao `/auth/login` (ver `shouldPromptBiometric`). Enquanto a biometria
 * está desligada a senha NÃO fica no storage, então ao reabrir o app a conta
 * chega sem ela e a ativação precisa pedir.
 *
 * Logo após um login digitado a senha ainda está em memória — aí não pedimos
 * nada e a digital já vale de imediato.
 */
export function needsPasswordToActivate(current?: UserCredentials | null): boolean {
    if (!current) return false;
    if (current.allowsBiometrics) return false; // já ligada: este caminho é desligar
    return !current.password;
}

/**
 * Mensagem para o motorista quando a confirmação de senha falha.
 *
 * A senha é conferida contra o `/auth/login` de verdade — sem isso, uma senha
 * errada seria gravada e a digital falharia no próximo login, que é pior do que
 * não ter digital: o erro apareceria longe da causa.
 *
 * O 401 vem do Keycloak para senha errada; o 400 cobre o grant recusado. O resto
 * (rede, 5xx) não é culpa do que a pessoa digitou e não pode ser rotulado como
 * "senha incorreta".
 */
export function resolveActivationError(error: unknown): string {
    const status = (error as { response?: { status?: number } })?.response?.status;

    if (status === 401 || status === 400) {
        return 'Senha incorreta. Tente de novo.';
    }

    const message = (error as { error?: { message?: string } })?.error?.message;
    return message || 'Não foi possível confirmar a senha agora. Tente de novo.';
}
