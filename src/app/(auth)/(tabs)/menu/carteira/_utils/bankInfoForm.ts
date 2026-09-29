import type { UpdateBankInfoRequest } from '@/domain/agility/wallet/dto/request/wallet.request';
import type { WalletResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { PixKeyType } from '@/domain/agility/wallet/dto/types';
import { validatePixKey } from '@/utils/validatePix';

export interface BankInfoForm {
    pixKeyType: PixKeyType | null;
    pixKey: string;
    bankName: string;
    bankAgency: string;
    bankAccount: string;
}

type BankFields = Pick<WalletResponse, 'pixKey' | 'pixKeyType' | 'bankName' | 'bankAgency' | 'bankAccount'>;

export function formFromWallet(wallet: BankFields): BankInfoForm {
    return {
        pixKeyType: wallet.pixKeyType ?? null,
        pixKey: wallet.pixKey ?? '',
        bankName: wallet.bankName ?? '',
        bankAgency: wallet.bankAgency ?? '',
        bankAccount: wallet.bankAccount ?? '',
    };
}

/**
 * Formato em que a chave é gravada (R8): CPF/CNPJ só dígitos, telefone +55DDDNÚMERO,
 * e-mail e aleatória em minúsculas. O operador copia a chave para o banco dele; a
 * máscara digitada pelo motorista atrapalhava.
 */
export function normalizePixKey(type: PixKeyType, raw: string): string {
    const trimmed = raw.trim();
    switch (type) {
        case PixKeyType.CPF:
        case PixKeyType.CNPJ:
            return trimmed.replace(/\D/g, '');
        case PixKeyType.PHONE: {
            const digits = trimmed.replace(/\D/g, '');
            const local = trimmed.startsWith('+55') ? digits.slice(2) : digits;
            return `+55${local}`;
        }
        case PixKeyType.EMAIL:
        case PixKeyType.RANDOM:
            return trimmed.toLowerCase();
        default:
            return trimmed;
    }
}

/**
 * Regras do R7, as mesmas do `hasBankInfo` do back: PIX, conta completa ou os dois; a
 * conta é o trio. Devolve a mensagem do primeiro problema, ou `null`.
 */
export function validateBankForm(form: BankInfoForm): string | null {
    const hasPix = form.pixKey.trim() !== '';
    if (hasPix) {
        const pixError = validatePixKey(form.pixKey, form.pixKeyType);
        if (pixError) return pixError;
    }

    const filled = [form.bankName, form.bankAgency, form.bankAccount].filter((v) => v.trim() !== '').length;
    if (filled > 0 && filled < 3) return 'Preencha banco, agência e conta, ou deixe os três em branco.';
    if (!hasPix && filled === 0) return 'Informe uma chave PIX ou os dados da conta para receber os saques.';
    return null;
}

/**
 * Sempre os cinco campos: preenchido vai normalizado, vazio vai `null` (apaga no back).
 * Chave vazia apaga chave E tipo, para não sobrar um tipo sem chave.
 */
export function buildBankInfoPayload(form: BankInfoForm): UpdateBankInfoRequest {
    const orNull = (value: string) => (value.trim() === '' ? null : value.trim());
    const hasPix = form.pixKey.trim() !== '' && form.pixKeyType !== null;
    return {
        pixKeyType: hasPix ? form.pixKeyType : null,
        pixKey: hasPix && form.pixKeyType ? normalizePixKey(form.pixKeyType, form.pixKey) : null,
        bankName: orNull(form.bankName),
        bankAgency: orNull(form.bankAgency),
        bankAccount: orNull(form.bankAccount),
    };
}
