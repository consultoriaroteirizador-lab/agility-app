/**
 * Reserva de polling da tela da rota.
 *
 * O caminho normal de atualização é o push do socket `/monitoring`. Em celular
 * ele cai — túnel, elevador, troca de antena, app em segundo plano — e a queda é
 * SILENCIOSA: ninguém, nem o motorista nem a central, descobre que o aviso não
 * chegou.
 *
 * A reserva do servidor não cobre isso: no reconnect ele reemite os últimos 50
 * eventos do TENANT, guardados em memória do processo. Numa empresa movimentada
 * o evento daquele motorista já saiu da janela, e reconectar noutro pod é
 * reconectar noutro buffer.
 *
 * Por isso a tela pergunta de novo, de tempos em tempos, enquanto a rota está em
 * andamento. É o que a busca de paradas já fazia; este módulo só dá nome ao
 * intervalo para que as duas buscas da tela não divirjam.
 *
 * @module rotas-detalhadas/utils/pollingReserva
 */

/**
 * Um minuto. Não é acaso: é o intervalo que a busca de paradas já usava, e
 * manter UM valor é o ponto deste módulo — duas constantes iguais divergem na
 * primeira vez que alguém mexe numa delas.
 */
export const INTERVALO_RESERVA_MS = 60_000

/**
 * De quanto em quanto tempo reperguntar, ou `undefined` para não perguntar.
 *
 * Só rota em andamento: rota encerrada não muda, e perguntar gasta bateria e o
 * dado do motorista, que costuma estar em plano limitado.
 */
export function intervaloDeReserva(isInProgress: boolean | null | undefined): number | undefined {
    return isInProgress ? INTERVALO_RESERVA_MS : undefined
}
