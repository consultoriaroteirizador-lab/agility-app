// src/utils/validatePix.ts

import { PixKeyType } from '@/domain/agility/wallet/dto/types';

const RANDOM_KEY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Hint humano por tipo, usado como placeholder/label de ajuda. */
export const PIX_KEY_HINTS: Record<PixKeyType, string> = {
    [PixKeyType.CPF]: '000.000.000-00',
    [PixKeyType.CNPJ]: '00.000.000/0000-00',
    [PixKeyType.EMAIL]: 'email@exemplo.com',
    [PixKeyType.PHONE]: '(11) 91234-5678',
    [PixKeyType.RANDOM]: 'UUID gerado pelo banco',
};

/**
 * Valida a chave PIX conforme o tipo selecionado.
 * Retorna `null` se válida, ou uma mensagem de erro humana.
 */
export function validatePixKey(value: string, type: PixKeyType | null): string | null {
    const trimmed = (value ?? '').trim();
    if (!trimmed) {
        return 'Informe a chave PIX';
    }
    if (!type) {
        return 'Selecione o tipo da chave PIX';
    }

    switch (type) {
        case PixKeyType.CPF: {
            const digits = trimmed.replace(/\D/g, '');
            if (digits.length !== 11) return 'CPF deve ter 11 dígitos';
            return null;
        }
        case PixKeyType.CNPJ: {
            const digits = trimmed.replace(/\D/g, '');
            if (digits.length !== 14) return 'CNPJ deve ter 14 dígitos';
            return null;
        }
        case PixKeyType.EMAIL: {
            if (!EMAIL_REGEX.test(trimmed)) return 'E-mail inválido';
            return null;
        }
        case PixKeyType.PHONE: {
            // Aceita com ou sem o +55: a chave salva vem normalizada como +55DDDNUMERO (R8),
            // e reabrir a tela não pode acusar erro nela.
            const digits = trimmed.replace(/\D/g, '');
            const local = trimmed.startsWith('+55') ? digits.slice(2) : digits;
            if (local.length < 10 || local.length > 11) {
                return 'Telefone deve ter DDD + número (10 ou 11 dígitos)';
            }
            return null;
        }
        case PixKeyType.RANDOM: {
            if (!RANDOM_KEY_REGEX.test(trimmed)) {
                return 'Chave aleatória deve ser um UUID (ex: 8400e8e7-1b9d-4f9b-b7d3-3a5b8d3c1a2b)';
            }
            return null;
        }
        default:
            return null;
    }
}
