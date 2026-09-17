import { isHandedOff, isTerminalStatus, othersConcluidos } from '../returnGate'

describe('isTerminalStatus', () => {
    it('aceita os quatro terminais, em qualquer caixa', () => {
        expect(isTerminalStatus('COMPLETED')).toBe(true)
        expect(isTerminalStatus('failed')).toBe(true)
        expect(isTerminalStatus('CANCELED')).toBe(true)
        expect(isTerminalStatus('CANCELLED')).toBe(true)
        expect(isTerminalStatus('PENDING')).toBe(false)
        expect(isTerminalStatus(null)).toBe(false)
    })
})

describe('isHandedOff', () => {
    it('AT_HUB so conta como entregue em perna de malha', () => {
        expect(isHandedOff('AT_HUB', 'TRANSFER')).toBe(true)
        expect(isHandedOff('AT_HUB', 'LAST_MILE')).toBe(false)
        expect(isHandedOff('AT_HUB', null)).toBe(false)
    })

    it('OUT_FOR_DELIVERY e DELIVERED contam em qualquer perna', () => {
        expect(isHandedOff('OUT_FOR_DELIVERY', null)).toBe(true)
        expect(isHandedOff('DELIVERED', 'LAST_MILE')).toBe(true)
    })

    it('fases pre-handoff nunca contam', () => {
        expect(isHandedOff('AT_ORIGIN', 'TRANSFER')).toBe(false)
        expect(isHandedOff('IN_TRANSIT', 'TRANSFER')).toBe(false)
        expect(isHandedOff('EXCEPTION', 'TRANSFER')).toBe(false)
        expect(isHandedOff(null, 'TRANSFER')).toBe(false)
    })
})

describe('othersConcluidos', () => {
    const rotaComum = null

    it('ignora a propria parada de retorno', () => {
        const services = [{ serviceType: 'RETURN', status: 'PENDING', custodyPhase: 'AT_ORIGIN' }]
        expect(othersConcluidos(services, rotaComum)).toBe(true)
    })

    it('pedido devolvido em rota comum (FAILED + AT_HUB) conta pelo status, nao pela fase', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'FAILED', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, rotaComum)).toBe(true)
    })

    it('pedido PENDING marcado AT_HUB em rota comum NAO libera o retorno', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'PENDING', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, rotaComum)).toBe(false)
    })

    it('em perna TRANSFER o mesmo pedido AT_HUB libera', () => {
        const services = [{ serviceType: 'DELIVERY', status: 'PENDING', custodyPhase: 'AT_HUB' }]
        expect(othersConcluidos(services, 'TRANSFER')).toBe(true)
    })
})
