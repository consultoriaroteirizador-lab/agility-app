import type { Ionicons } from '@expo/vector-icons';

import type { TransactionResponse } from '@/domain/agility/wallet/dto/response/wallet.response';
import { LedgerSourceType, TransactionStatus, TransactionType } from '@/domain/agility/wallet/dto/types';
import type { StatusColorConfig } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';

export type TransactionCategory = 'freight' | 'withdrawals' | 'adjustments' | 'advances' | 'other';
export type ExtratoFilter = 'all' | Exclude<TransactionCategory, 'other'>;
export type AmountColor = 'colorTextSuccess' | 'colorTextError' | 'colorTextSecondary' | 'colorTextWarning';

type IconName = keyof typeof Ionicons.glyphMap;

interface TypeConfig {
    label: string;
    icon: IconName;
    iconColor: string;
    bgColor: string;
    category: TransactionCategory;
    /** De onde para onde o dinheiro foi, para quem não muda o total. */
    movement?: string;
}

const TYPE_CONFIG: Record<TransactionType, TypeConfig> = {
    [TransactionType.FREIGHT]: {
        label: 'Frete', icon: 'car', iconColor: '#9C27B0', bgColor: '#F3E5F5', category: 'freight',
        movement: 'Fica em "Frete a liberar" até a empresa liberar',
    },
    [TransactionType.FREIGHT_RELEASE]: {
        label: 'Frete liberado', icon: 'lock-open', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'freight',
        movement: 'Frete a liberar → Disponível',
    },
    [TransactionType.WITHDRAWAL_HOLD]: {
        label: 'Saque solicitado', icon: 'time', iconColor: '#FF9800', bgColor: '#FFF3E0', category: 'withdrawals',
        movement: 'Disponível → Saque pendente',
    },
    [TransactionType.WITHDRAWAL_HOLD_RELEASE]: {
        label: 'Saque devolvido', icon: 'arrow-undo', iconColor: '#2196F3', bgColor: '#E3F2FD', category: 'withdrawals',
        movement: 'Saque pendente → Disponível',
    },
    [TransactionType.WITHDRAWAL]: { label: 'Saque pago', icon: 'cash-outline', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'withdrawals' },
    [TransactionType.MANUAL_CREDIT]: { label: 'Crédito da empresa', icon: 'add-circle', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'adjustments' },
    [TransactionType.MANUAL_DEBIT]: { label: 'Débito da empresa', icon: 'remove-circle', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'adjustments' },
    // Legados (antes da F2).
    [TransactionType.CREDIT]: { label: 'Crédito', icon: 'add-circle', iconColor: '#4CAF50', bgColor: '#E8F5E9', category: 'freight' },
    [TransactionType.DEBIT]: { label: 'Débito', icon: 'remove-circle', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'withdrawals' },
    [TransactionType.REFUND]: { label: 'Estorno', icon: 'refresh', iconColor: '#2196F3', bgColor: '#E3F2FD', category: 'adjustments' },
    [TransactionType.ADJUSTMENT]: { label: 'Ajuste', icon: 'create', iconColor: '#607D8B', bgColor: '#ECEFF1', category: 'adjustments' },
    [TransactionType.ADVANCE]: { label: 'Adiantamento', icon: 'arrow-forward', iconColor: '#FF9800', bgColor: '#FFF3E0', category: 'advances' },
    [TransactionType.ADVANCE_RETURN]: { label: 'Devolução de adiantamento', icon: 'arrow-back', iconColor: '#FF5722', bgColor: '#FBE9E7', category: 'advances' },
    [TransactionType.COMMISSION]: { label: 'Comissão', icon: 'pricetag', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'adjustments' },
    [TransactionType.BONUS]: { label: 'Bônus', icon: 'gift', iconColor: '#E91E63', bgColor: '#FCE4EC', category: 'adjustments' },
};

/** MANUAL_DEBIT de origem FREIGHT_SHARE_REVERSAL: a empresa liberou menos que o bloqueado, ou cancelou. */
const FREIGHT_REVERSAL: TypeConfig = { label: 'Estorno de frete', icon: 'return-down-back', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'freight' };
/**
 * FREIGHT_RELEASE com `metadata.action === 'CANCEL'` (back, `freight-share-admin.service.ts`
 * `cancelPlan`): o operador cancelou a parcela, não liberou. Mesmo `type` do "Frete liberado"
 * normal — sem este desvio o motorista via "Frete liberado" numa parcela cancelada.
 */
const FREIGHT_CANCEL: TypeConfig = {
    label: 'Frete cancelado', icon: 'close-circle', iconColor: '#F44336', bgColor: '#FFEBEE', category: 'freight',
    movement: 'Frete a liberar → Cancelado',
};
const UNKNOWN: TypeConfig = { label: 'Movimentação', icon: 'swap-horizontal', iconColor: '#607D8B', bgColor: '#ECEFF1', category: 'other' };

const STATUS_BADGE: Partial<Record<TransactionStatus, StatusColorConfig>> = {
    [TransactionStatus.PENDING]: { label: 'Pendente', textColor: 'yellow100', bgColor: 'yellow20' },
    [TransactionStatus.CANCELLED]: { label: 'Cancelado', textColor: 'gray400', bgColor: 'gray50' },
    [TransactionStatus.FAILED]: { label: 'Falhou', textColor: 'colorTextError', bgColor: 'gray50' },
};

export const EXTRATO_FILTERS: { value: ExtratoFilter; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'freight', label: 'Fretes' },
    { value: 'withdrawals', label: 'Saques' },
    { value: 'adjustments', label: 'Ajustes' },
    { value: 'advances', label: 'Adiantamentos' },
];

type TxShape = Pick<TransactionResponse, 'type' | 'direction' | 'affectsBalance' | 'status' | 'amount' | 'sourceType' | 'metadata'>;

export interface TransactionDisplay {
    label: string;
    icon: IconName;
    iconColor: string;
    bgColor: string;
    category: TransactionCategory;
    /** "+R$ 50,00", "-R$ 50,00" ou "R$ 50,00" (movimento entre baldes). */
    amountText: string;
    amountColor: AmountColor;
    movement: string | null;
    badge: StatusColorConfig | null;
}

function configOf(tx: Pick<TransactionResponse, 'type' | 'sourceType' | 'metadata'>): TypeConfig {
    if (tx.sourceType === LedgerSourceType.FREIGHT_SHARE_REVERSAL) return FREIGHT_REVERSAL;
    if (tx.type === TransactionType.FREIGHT_RELEASE && tx.metadata?.action === 'CANCEL') return FREIGHT_CANCEL;
    return TYPE_CONFIG[tx.type] ?? UNKNOWN;
}

/**
 * Como uma linha do livro-razão aparece no extrato.
 *
 * - Sinal: SEMPRE `direction` (F2). `isCredit` e o tipo não entram.
 * - `affectsBalance: false` (frete liberado, saque bloqueado/devolvido): sem sinal, em cinza,
 *   com o movimento. O total não muda nessas linhas; com sinal, frete e saque apareceriam
 *   duas vezes.
 * - Status: PENDING em aviso; CANCELLED/FAILED em cinza, porque não moveram dinheiro.
 */
export function describeTransaction(tx: TxShape): TransactionDisplay {
    const config = configOf(tx);
    const neutral = tx.affectsBalance === false;
    const sign = neutral ? '' : tx.direction === 'IN' ? '+' : '-';

    let amountColor: AmountColor;
    if (neutral || tx.status === TransactionStatus.CANCELLED || tx.status === TransactionStatus.FAILED) {
        amountColor = 'colorTextSecondary';
    } else if (tx.status === TransactionStatus.PENDING) {
        amountColor = 'colorTextWarning';
    } else {
        amountColor = tx.direction === 'IN' ? 'colorTextSuccess' : 'colorTextError';
    }

    return {
        label: config.label,
        icon: config.icon,
        iconColor: config.iconColor,
        bgColor: config.bgColor,
        category: config.category,
        amountText: `${sign}${formatCurrency(tx.amount)}`,
        amountColor,
        movement: config.movement ?? null,
        badge: STATUS_BADGE[tx.status] ?? null,
    };
}

export function categoryOf(tx: Pick<TransactionResponse, 'type' | 'sourceType' | 'metadata'>): TransactionCategory {
    return configOf(tx).category;
}

/** Filtro no cliente, sobre as páginas acumuladas: o back só aceita UM `type` exato (R2). */
export function filterTransactions<T extends Pick<TransactionResponse, 'type' | 'sourceType' | 'metadata'>>(list: T[], filter: ExtratoFilter): T[] {
    if (filter === 'all') return list;
    return list.filter((tx) => categoryOf(tx) === filter);
}
