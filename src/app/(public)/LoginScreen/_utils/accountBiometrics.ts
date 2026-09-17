import { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';

/**
 * Decisoes de biometria sao POR CONTA. Antes, o login lia a preferencia (e o
 * nome) de `userCredentialsCurrent` — que, ao adicionar/trocar de conta, ainda
 * e a conta ANTERIOR. Uma conta nova nascia herdando a digital de outra pessoa,
 * sem nunca ter perguntado.
 */

function sameUser(a?: string | null, b?: string | null): boolean {
    if (!a || !b) return false;
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

interface ResolveParams {
    username: string;
    password: string;
    /** Contas ja salvas no aparelho. */
    savedList: UserCredentials[] | null;
    profileName?: string | null;
    profileAlias?: string | null;
}

/**
 * Monta o registro a salvar apos um login bem-sucedido, buscando a preferencia
 * na propria conta que esta entrando. Conta desconhecida fica com
 * `allowsBiometrics: undefined` — o _layout entao leva o motorista para a tela
 * de escolha em vez de decidir por ele.
 */
export function resolveCredentialsToSave({
    username,
    password,
    savedList,
    profileName,
    profileAlias,
}: ResolveParams): UserCredentials {
    const previous = savedList?.find((saved) => sameUser(saved.username, username));

    return {
        username: username.trim(),
        password,
        name: profileName || previous?.name || '',
        alias: profileAlias || previous?.alias || '',
        allowsBiometrics: previous?.allowsBiometrics,
    };
}

interface PromptParams {
    isLoadingCredentials: boolean;
    deviceId?: string | null;
    current: UserCredentials | null;
    /** Usuario para o qual a digital ja foi oferecida nesta sessao. */
    attemptedFor: string | null;
}

/**
 * A oferta da digital e amarrada ao usuario, e nao a uma flag booleana de
 * "ja tentei" — senao, depois de trocar de conta, a conta nova com biometria
 * ativa nunca era oferecida e o motorista era obrigado a digitar a senha.
 */
export function shouldPromptBiometric({
    isLoadingCredentials,
    deviceId,
    current,
    attemptedFor,
}: PromptParams): boolean {
    if (isLoadingCredentials) return false;
    if (!deviceId) return false;
    if (!current?.allowsBiometrics) return false;
    if (!current.password) return false;
    if (sameUser(attemptedFor, current.username)) return false;

    return true;
}

/**
 * A conta LIGOU a biometria, mas ainda não dá para oferecê-la: falta a senha
 * que `shouldPromptBiometric` exige para reenviar ao `/auth/login`.
 *
 * Não é erro, é consequência da poda: com a biometria desligada a senha não fica
 * no storage, então ao REABRIR o app `userCredentialsCurrent` chega sem ela.
 * Quem liga a digital pelo menu nesse momento grava só a preferência. A digital
 * passa a valer no próximo login digitado — aí `resolveCredentialsToSave` grava
 * a senha já com `allowsBiometrics: true`.
 *
 * Existe para a tela poder DIZER isso. Sem essa distinção o toggle mostrava
 * "Ativado", a digital nunca era oferecida, e o motorista não tinha como
 * descobrir por quê.
 */
export function isBiometricPendingNextLogin(current?: UserCredentials | null): boolean {
    if (!current?.allowsBiometrics) return false;
    return !current.password;
}
