// src/utils/formatCurrency.ts

/**
 * Formats a value to Brazilian Real currency format
 * @param value - Value in cents (e.g., 100 = R$ 1,00) or reais if isInReais is true
 * @param isInReais - If true, value is already in reais (e.g., 850 = R$ 850,00). Default: false (value in cents)
 * @returns Formatted currency string
 */
export function formatCurrency(value: number | undefined | null | string, isInReais: boolean = false): string {
    if (value === undefined || value === null) {
        return 'R$ 0,00';
    }

    const numValue = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(numValue)) {
        return 'R$ 0,00';
    }

    const reais = isInReais ? numValue : numValue / 100;
    return reais.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}
