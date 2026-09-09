import { StorageSecurity } from "../storage/implementation/StorageSecurity";
import { UserCredentials } from "../userAuthInfo/UserAuthInfoType";



const USER_CREDENTIALS_KEY = 'UserCredentialsAgilityApp';
const USER_CREDENTIALS_CURRENT_KEY = 'UserCredentialsCurrentAgilityApp';

/**
 * A senha só é gravada no aparelho quando o motorista LIGOU a biometria — ela
 * existe unicamente para ser reenviada ao `/auth/login` depois da digital
 * (`useLoginController`). Antes, `resolveCredentialsToSave` anexava a senha em
 * TODO login e ela ficava guardada para sempre mesmo para quem recusou a digital:
 * credencial primária em repouso sem nenhum uso funcional.
 *
 * A poda mora aqui, no ponto de gravação, e não em cada chamador — todo caminho
 * de escrita (login, tela de escolha, toggle do menu) passa por `setCurrent`/
 * `setInAll`, então nenhum caller novo consegue esquecer de podar.
 *
 * Consequência conhecida: ligar a biometria pelo menu DEPOIS de reabrir o app
 * não reaproveita uma senha antiga (ela não está mais lá). O próximo login é
 * digitado e, aí sim, já com `allowsBiometrics: true`, a senha é gravada e a
 * digital passa a valer do login seguinte em diante.
 */
function stripPasswordUnlessBiometric(uc: UserCredentials): UserCredentials {
    if (uc.allowsBiometrics === true) return uc;
    const { password: _password, ...withoutPassword } = uc;
    return withoutPassword;
}


async function setInAll(uc: UserCredentials): Promise<void> {
    let existingCredentials = await getAll();
    const toPersist = stripPasswordUnlessBiometric(uc);

    if (existingCredentials) {
        const userIndex = existingCredentials.findIndex((cred) => cred.username === uc.username);

        if (userIndex !== -1) {
            existingCredentials[userIndex] = toPersist;
        } else {
            existingCredentials.push(toPersist);
        }
    } else {
        existingCredentials = [toPersist];
    }

    await StorageSecurity.setItem(USER_CREDENTIALS_KEY, existingCredentials);
}


async function setCurrent(uc: UserCredentials): Promise<void> {
    await StorageSecurity.setItem(USER_CREDENTIALS_CURRENT_KEY, stripPasswordUnlessBiometric(uc))
}

async function getCurrent(): Promise<UserCredentials | null> {
    try {
        const userCredentials = await StorageSecurity.getItem<UserCredentials>(USER_CREDENTIALS_CURRENT_KEY);
        return userCredentials;
    } catch {
        throw Error("Erro ao buscar UserCredentials")
    }
}


async function getAll(): Promise<UserCredentials[] | null> {
    try {
        const uc = await StorageSecurity.getItem<UserCredentials[]>(USER_CREDENTIALS_KEY);
        return uc;
    } catch {
        throw Error("Erro ao buscar UserCredentials")
    }
}

async function remove(uc: UserCredentials): Promise<void> {
    const existingCredentials = await getAll();

    if (!existingCredentials) return;

    const userIndex = existingCredentials.findIndex((cred) => cred.username === uc.username);
    if (userIndex === -1) return;

    existingCredentials.splice(userIndex, 1);

    await StorageSecurity.setItem(USER_CREDENTIALS_KEY, existingCredentials);
}

async function removeCurrent(): Promise<void> {
    await StorageSecurity.removeItem(USER_CREDENTIALS_CURRENT_KEY)
}

export const userCredentialsStorage = { setInAll, getAll, remove, setCurrent, getCurrent, removeCurrent }
