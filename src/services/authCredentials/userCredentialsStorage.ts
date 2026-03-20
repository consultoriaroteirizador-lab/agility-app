import { StorageSecurity } from "../storage/implementation/StorageSecurity";
import { UserCredentials } from "../userAuthInfo/UserAuthInfoType";



const USER_CREDENTIALS_KEY = 'UserCredentialsAgilityApp';
const USER_CREDENTIALS_CURRENT_KEY = 'UserCredentialsCurrentAgilityApp';


async function setInAll(uc: UserCredentials): Promise<void> {
    console.log('Iniciando a função set() com as credenciais:', uc);

    let existingCredentials = await getAll();

    if (existingCredentials) {
        const userIndex = existingCredentials.findIndex((cred) => cred.username === uc.username);
        console.log('Índice do usuário encontrado:', userIndex);

        if (userIndex !== -1) {
            console.log(`Usuário ${uc.username} encontrado. Atualizando credenciais.`);
            existingCredentials[userIndex] = uc;
        } else {
            console.log(`Usuário ${uc.username} não encontrado. Adicionando nova credencial.`);
            existingCredentials.push(uc);
        }
    } else {
        console.log('Nenhuma credencial encontrada. Criando nova lista.');
        existingCredentials = [uc];
    }

    console.log('Salvando credenciais atualizadas:');
    await StorageSecurity.setItem(USER_CREDENTIALS_KEY, existingCredentials);

    console.log('Credenciais salvas com sucesso!');
}


async function setCurrent(uc: UserCredentials): Promise<void> {
    await StorageSecurity.setItem(USER_CREDENTIALS_CURRENT_KEY, uc)
}

async function getCurrent(): Promise<UserCredentials | null> {
    console.log('Iniciando a função get() UserCredentials');
    try {
        const userCredentials = await StorageSecurity.getItem<UserCredentials>(USER_CREDENTIALS_CURRENT_KEY);
        return userCredentials;
    } catch (error) {
        console.log(`Erro get UserCredentials :: ${error}`)
        throw Error("Erro ao buscar UserCredentials")
    }
}


async function getAll(): Promise<UserCredentials[] | null> {
    console.log('Iniciando a função get() UserCredentials');
    try {
        const uc = await StorageSecurity.getItem<UserCredentials[]>(USER_CREDENTIALS_KEY);
        return uc;
    } catch (error) {
        console.log(`Erro get UserCredentials :: ${error}`)
        throw Error("Erro ao buscar UserCredentials")
    }
}

async function remove(uc: UserCredentials): Promise<void> {
    console.log('Iniciando a função remove() com as credenciais:', uc);

    let existingCredentials = await getAll();
    console.log('Credenciais existentes:', existingCredentials);

    if (existingCredentials) {
        const userIndex = existingCredentials.findIndex((cred) => cred.username === uc.username);
        console.log('Índice do usuário encontrado:', userIndex);

        if (userIndex !== -1) {
            console.log(`Usuário ${uc.username} encontrado. Atualizando credenciais.`);
            existingCredentials.splice(userIndex, 1);
        } else {
            console.log(`Usuário ${uc.username} não encontrado`);
            return
        }
    } else {
        console.log('Nenhuma credencial encontrada.');
        return;
    }

    console.log('Salvando credenciais atualizadas:', existingCredentials);
    await StorageSecurity.setItem(USER_CREDENTIALS_KEY, existingCredentials);

    console.log('Credencial removida com sucesso!');
}

async function removeCurrent(): Promise<void> {
    await StorageSecurity.removeItem(USER_CREDENTIALS_CURRENT_KEY)
}

export const userCredentialsStorage = { setInAll, getAll, remove, setCurrent, getCurrent, removeCurrent }