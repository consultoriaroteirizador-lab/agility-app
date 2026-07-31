/**
 * Derivações de EXIBIÇÃO da parada agrupada (Camada 2).
 *
 * São os dois itens da lista de aceite (§8) que acabam em texto na tela: o selo
 * de notas do card da parada e a linha de progresso da rota. Estavam inline nos
 * componentes, e este repo não tem teste de componente — um refactor de
 * `isGrupoMisto` ou da condição `notasTotal > total` regredia em silêncio.
 * Aqui a derivação é pura, testável e tem UM dono: o mesmo selo é usado pelo
 * card da lista e pela linha do "Concluídas com insucesso", que precisam
 * concordar sobre o que "3 de 5" significa.
 *
 * @module rotas-detalhadas/utils/paradaDisplay
 */

import type { ServiceResponse } from '@/domain/agility/service/dto'

import type { ParadaStatus } from '../_types/rota.types'

import type { ParadaCountResult } from './routeCalculations'

/** O que a parada precisa expor para o selo de notas. */
export interface NotasBadgeInput {
    status: ParadaStatus
    pedidos?: ServiceResponse[] | null
}

export interface NotasBadge {
    /** Notas da parada. Sem `pedidos`, cai para 1 — mesmo fallback de `countParadasByStatus`. */
    totalNotas: number
    /** Notas efetivamente entregues (isCompleted). */
    notasEntregues: number
    /** Parada de insucesso em que ALGUMA nota foi entregue (§3.3). */
    isGrupoMisto: boolean
    /** Texto do selo, ou null quando a parada tem uma nota só (não exibe selo). */
    label: string | null
}

/**
 * Texto do selo de notas. UM dono para a frase: o card da lista e a linha do
 * "Concluídas com insucesso" precisam dizer a mesma coisa sobre a mesma porta.
 *
 * `null` quando a parada tem uma nota só — aí não há selo, e a tela fica
 * idêntica ao que era antes do agrupamento.
 */
export function formatNotasLabel(
    totalNotas: number,
    notasEntregues: number,
    isGrupoMisto: boolean,
): string | null {
    if (totalNotas <= 1) return null
    return isGrupoMisto ? `${notasEntregues} de ${totalNotas} entregues` : `${totalNotas} notas`
}

/**
 * Selo de notas do card da parada.
 *
 * `N notas` no caso comum; `3 de 5 entregues` quando a parada fecha em insucesso
 * mas parte das notas foi entregue (§3.3) — é o recorte que não esconde do
 * operador que a porta foi parcialmente atendida.
 *
 * Parada de UMA nota devolve `label: null`: a tela fica idêntica ao que era
 * antes do agrupamento, que é a situação da maioria das empresas.
 */
export function resolveNotasBadge(parada: NotasBadgeInput): NotasBadge {
    const pedidos = parada.pedidos ?? []
    // `|| 1` (não `?? 1`): `pedidos` vazio significa "dado não carregado", e o
    // denominador tem que valer 1 nota — o mesmo critério que
    // `countParadasByStatus` usa, senão o card e o contador discordam.
    const totalNotas = pedidos.length || 1
    const notasEntregues = pedidos.filter((p) => p.isCompleted === true).length
    const isGrupoMisto = parada.status === 'concluida-insucesso' && notasEntregues > 0

    return {
        totalNotas,
        notasEntregues,
        isGrupoMisto,
        label: formatNotasLabel(totalNotas, notasEntregues, isGrupoMisto),
    }
}

/** Campos do pedido que identificam a nota para quem está no balcão. */
export interface NotaFiscalInput {
    /** Número da NOTA FISCAL do pedido. */
    invoicing?: string | null
    /** Código interno do sistema (ex.: ARA-260513-1542-WMFR). Último recurso. */
    identificationCode?: string | null
}

/**
 * Identificação da nota no card do índice da parada.
 *
 * O motorista está no balcão com as notas de papel na mão e precisa casar papel
 * com tela. O que casa é o número da NOTA FISCAL (`invoicing`), não o
 * `identificationCode`, que é código interno do sistema e não aparece em lugar
 * nenhum do papel.
 *
 * Quando a NF vem só como número, ganha o prefixo `NF` para o motorista saber o
 * que está lendo — mas o prefixo NÃO é aplicado ao código interno, porque
 * chamá-lo de nota fiscal seria mentira. Sem nenhum dos dois, devolve `null` e o
 * card cai no ordinal ("Nota 2 de 5").
 */
export function resolveNotaFiscalLabel(pedido?: NotaFiscalInput | null): string | null {
    const nf = pedido?.invoicing?.trim()
    if (nf) {
        return /^nf/i.test(nf) ? nf : `NF ${nf}`
    }

    const interno = pedido?.identificationCode?.trim()
    return interno || null
}

/** Linha de apoio do card: posição da nota no grupo e, quando há, a janela dela. */
export function formatResumoDaNota(indice: number, total: number, janela?: string | null): string {
    const ordinal = `Nota ${indice} de ${total}`
    return janela ? `${ordinal} · ${janela}` : ordinal
}

/**
 * Texto da linha de progresso da rota.
 *
 * Paradas e notas são grandezas diferentes: 26 portas, 56 notas. O cliente já
 * opera com a distinção (a planilha tem as duas colunas). Quando cada parada tem
 * uma nota só — a maioria das empresas — o texto continua sendo o curto de
 * sempre, para não introduzir jargão onde não há ambiguidade.
 */
export function resolveProgressoTexto(contagem: ParadaCountResult): string {
    if (contagem.notasTotal > contagem.total) {
        return `${contagem.concluidas} de ${contagem.total} paradas · ${contagem.notasConcluidas} de ${contagem.notasTotal} notas`
    }
    return `${contagem.concluidas} de ${contagem.total} concluídas`
}
