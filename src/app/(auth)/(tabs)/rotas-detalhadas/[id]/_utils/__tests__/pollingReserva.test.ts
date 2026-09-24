import { INTERVALO_RESERVA_MS, intervaloDeReserva } from '../pollingReserva'

describe('intervaloDeReserva', () => {
    it('faz a reserva enquanto a rota está em andamento', () => {
        expect(intervaloDeReserva(true)).toBe(INTERVALO_RESERVA_MS)
    })

    /**
     * Rota encerrada não recebe evento nem muda: perguntar de novo só gasta
     * bateria e dado do motorista, que costuma estar em plano limitado.
     */
    it('não pergunta nada quando a rota não está em andamento', () => {
        expect(intervaloDeReserva(false)).toBeUndefined()
    })

    /** Rota ainda carregando (`isInProgress` indefinido) não é "em andamento". */
    it('trata ausência de rota como não-andamento', () => {
        expect(intervaloDeReserva(undefined)).toBeUndefined()
        expect(intervaloDeReserva(null)).toBeUndefined()
    })

    /**
     * O intervalo é UM só, compartilhado pelas duas buscas da tela (paradas e
     * devoluções pendentes). Duas constantes iguais divergem na primeira vez que
     * alguém mexe numa delas, e a tela passa a se atualizar em dois ritmos sem
     * ninguém decidir isso.
     */
    it('o intervalo é um minuto', () => {
        expect(INTERVALO_RESERVA_MS).toBe(60_000)
    })
})
