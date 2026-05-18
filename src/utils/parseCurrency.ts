// src/utils/parseCurrency.ts

/**
 * Converte uma string formatada em BRL para um inteiro de centavos.
 *
 * Estratégia: extrai apenas dígitos e interpreta o resultado como centavos.
 * Isso evita ambiguidade com separadores (R$ 1.000,50 vs 1000.50 vs 1,000.50)
 * porque assume que a string já foi produzida por uma máscara de input em centavos
 * (typar "12345" → "R$ 123,45"). É o contrato esperado pelo input no app.
 *
 * @example
 *   parseBRLToCents('R$ 1.234,56')  // 123456
 *   parseBRLToCents('R$ 100,00')    // 10000
 *   parseBRLToCents('R$ 0,50')      // 50
 *   parseBRLToCents('')             // null
 *   parseBRLToCents('R$ 0,00')      // 0
 */
export function parseBRLToCents(input: string | null | undefined): number | null {
    if (!input) return null;
    const digits = input.replace(/\D/g, '');
    if (!digits) return null;
    const cents = parseInt(digits, 10);
    return Number.isFinite(cents) ? cents : null;
}
