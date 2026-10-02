/**
 * `Routing.totalValue` é o valor da ROTA inteira, em reais — não o frete de quem a concluiu.
 * Com troca de motorista (F3) cada um recebe a sua parcela, que aparece em Ganhos e no
 * Extrato. Por isso o rótulo explícito (R5).
 */
export function routeValueLabel(totalValueReais?: number | null): string {
    const valor = typeof totalValueReais === 'number' && Number.isFinite(totalValueReais) && totalValueReais > 0 ? totalValueReais : 0;
    return `Valor da rota: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
}
