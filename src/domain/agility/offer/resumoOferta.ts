/**
 * Textos da oferta de rota mostrados à motorista: o resumo do aviso em tempo real e a
 * confirmação de aceitar.
 *
 * Km e tempo só existem depois que a rota é otimizada. Sem isso chegam 0 ou null, e o aviso
 * afirmava "0 km · 0min" (rodada de 09/10/2026). Zero aqui quer dizer "não calculado", então
 * some do texto.
 */

interface ResumoInput {
    totalServices?: number | null;
    totalDistanceKm?: number | null;
    totalDurationMinutes?: number | null;
}

const paradas = (n: number) => (n === 1 ? '1 parada' : `${n} paradas`);

function tempo(minutos: number): string {
    if (minutos < 60) return `${Math.round(minutos)}min`;
    const horas = Math.floor(minutos / 60);
    const mins = Math.round(minutos % 60);
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
}

const reais = (valor: number) => `R$ ${valor.toFixed(2).replace('.', ',')}`;

/** "2 paradas · 12,3 km · 1h 35min"; sem cálculo de rota, só "2 paradas". */
export function resumoDaOferta({ totalServices, totalDistanceKm, totalDurationMinutes }: ResumoInput): string {
    const partes: string[] = [];
    if (totalServices != null) partes.push(paradas(totalServices));
    if (totalDistanceKm) partes.push(`${totalDistanceKm.toFixed(1).replace('.', ',')} km`);
    if (totalDurationMinutes) partes.push(tempo(totalDurationMinutes));
    return partes.join(' · ');
}

interface AceitarInput {
    code?: string | null;
    totalParadas: number;
    totalValue?: number | null;
}

/** Corpo da confirmação "Aceitar oferta": qual rota, quantas paradas e o valor. */
export function textoAceitarOferta({ code, totalParadas, totalValue }: AceitarInput): string {
    const rota = code ? `a rota ${code}` : 'esta rota';
    // null = frete não informado (oferta interna pode não ter): não afirmar "R$ 0,00".
    const valor = totalValue == null ? 'frete não definido' : reais(totalValue);
    return `Você vai assumir ${rota}: ${paradas(totalParadas)}, ${valor}.`;
}
