import type { CheckStatus } from './itemCheckPhoto';

/** Em que momento o motorista está checando: entrega ao cliente, coleta de retorno ou saída do service. */
export type CheckContext = 'delivery' | 'pickup' | 'equipment';

export interface CheckTexts {
    /** Opções exibidas, na ordem. */
    statuses: CheckStatus[];
    labels: Record<CheckStatus, string>;
    descriptions: Record<CheckStatus, string>;
    /** Rótulo do campo de quantidade, sem os dois-pontos. */
    quantityLabel: string;
    /** Dica sob a quantidade quando avariado (só a entrega tem). */
    damagedQuantityHint?: string;
}

const ALL_STATUSES: CheckStatus[] = ['CHECKED', 'PARTIAL', 'MISSING', 'DAMAGED', 'REFUSED'];

const DELIVERY: CheckTexts = {
    statuses: ALL_STATUSES,
    labels: {
        CHECKED: 'Entregue',
        PARTIAL: 'Parcial',
        MISSING: 'Não encontrado',
        DAMAGED: 'Danificado',
        REFUSED: 'Recusado',
    },
    descriptions: {
        CHECKED: 'Item entregue com sucesso',
        PARTIAL: 'Entrega parcial',
        MISSING: 'Item não estava disponível',
        DAMAGED: 'Item chegou danificado',
        REFUSED: 'Cliente recusou o item',
    },
    quantityLabel: 'Quantidade entregue',
    damagedQuantityHint: 'Informe quanto você entregou; o restante volta ao CD.',
};

const PICKUP: CheckTexts = {
    statuses: ALL_STATUSES,
    labels: {
        CHECKED: 'Coletado',
        PARTIAL: 'Coleta parcial',
        MISSING: 'Não encontrado',
        DAMAGED: 'Avariado',
        REFUSED: 'Cliente não devolveu',
    },
    descriptions: {
        CHECKED: 'Item recolhido do cliente',
        PARTIAL: 'Recolhido em quantidade menor',
        MISSING: 'Item não estava no cliente',
        DAMAGED: 'Item recolhido com avaria',
        REFUSED: 'Cliente não entregou o item',
    },
    quantityLabel: 'Quantidade coletada',
};

const EQUIPMENT: CheckTexts = {
    statuses: ['CHECKED', 'PARTIAL', 'MISSING', 'DAMAGED'],
    labels: {
        CHECKED: 'Levei',
        PARTIAL: 'Levei parcial',
        MISSING: 'Não levei',
        DAMAGED: 'Danificado',
        // Sem opção na tela; o texto só completa o Record.
        REFUSED: 'Recusado',
    },
    descriptions: {
        CHECKED: 'Equipamento conferido no veículo',
        PARTIAL: 'Levei menos que o previsto',
        MISSING: 'Equipamento não estava disponível',
        DAMAGED: 'Equipamento com defeito ou avaria',
        REFUSED: '',
    },
    quantityLabel: 'Quantidade levada',
};

const BY_CONTEXT: Record<CheckContext, CheckTexts> = {
    delivery: DELIVERY,
    pickup: PICKUP,
    equipment: EQUIPMENT,
};

export function getCheckTexts(context: CheckContext = 'delivery'): CheckTexts {
    return BY_CONTEXT[context];
}

/** Título do campo de quantidade: obrigatório no parcial, opcional na avaria. */
export function quantityTitle(texts: CheckTexts, required: boolean): string {
    return required ? `${texts.quantityLabel}:` : `${texts.quantityLabel} (opcional):`;
}
