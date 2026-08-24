import {
    coletaReadyAfterChecks,
    entregaReadyAfterChecks,
    servicoReadyAfterChecks,
    transferReadyAfterChecks,
} from '../readyAfterChecks'

describe('entregaReadyAfterChecks', () => {
    const base = {
        delivered: true,
        needsDeliveryCheck: false,
        needsReturnCheck: false,
        hasFormGroups: false,
        formCompleted: false,
    }

    it('true quando entregue, sem checks pendentes e sem formulario', () => {
        expect(entregaReadyAfterChecks(base)).toBe(true)
    })

    it('false quando ainda nao entregou', () => {
        expect(entregaReadyAfterChecks({ ...base, delivered: false })).toBe(false)
    })

    it('false quando falta o check dos itens entregues', () => {
        expect(entregaReadyAfterChecks({ ...base, needsDeliveryCheck: true })).toBe(false)
    })

    it('false quando falta o check de retorno', () => {
        expect(entregaReadyAfterChecks({ ...base, needsReturnCheck: true })).toBe(false)
    })

    it('false quando tem formulario dinamico pendente', () => {
        expect(entregaReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: false })).toBe(false)
    })

    it('true quando tem formulario dinamico mas ja foi preenchido', () => {
        expect(entregaReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: true })).toBe(true)
    })
})

describe('coletaReadyAfterChecks', () => {
    const base = {
        delivered: true,
        needsMaterialCheck: false,
        hasFormGroups: false,
        formCompleted: false,
    }

    it('true quando coletou, sem check de material pendente e sem formulario', () => {
        expect(coletaReadyAfterChecks(base)).toBe(true)
    })

    it('false quando ainda nao coletou', () => {
        expect(coletaReadyAfterChecks({ ...base, delivered: false })).toBe(false)
    })

    it('false quando falta o check de material', () => {
        expect(coletaReadyAfterChecks({ ...base, needsMaterialCheck: true })).toBe(false)
    })

    it('false quando tem formulario dinamico pendente', () => {
        expect(coletaReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: false })).toBe(false)
    })

    it('true quando tem formulario dinamico mas ja foi preenchido', () => {
        expect(coletaReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: true })).toBe(true)
    })
})

describe('servicoReadyAfterChecks', () => {
    const base = { delivered: true, hasFormGroups: false, formCompleted: false }

    it('true quando realizado e sem formulario', () => {
        expect(servicoReadyAfterChecks(base)).toBe(true)
    })

    it('false quando ainda nao realizou', () => {
        expect(servicoReadyAfterChecks({ ...base, delivered: false })).toBe(false)
    })

    it('false quando tem formulario dinamico pendente', () => {
        expect(servicoReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: false })).toBe(false)
    })

    it('true quando tem formulario dinamico mas ja foi preenchido', () => {
        expect(servicoReadyAfterChecks({ ...base, hasFormGroups: true, formCompleted: true })).toBe(true)
    })
})

describe('transferReadyAfterChecks', () => {
    it('readyAfterChecks true quando entregue/coletado e sem check pendente', () => {
        const result = transferReadyAfterChecks({ isPickup: true, delivered: true, needsCheck: false })
        expect(result.readyAfterChecks).toBe(true)
    })

    it('readyAfterChecks false quando falta o check de itens', () => {
        const result = transferReadyAfterChecks({ isPickup: true, delivered: true, needsCheck: true })
        expect(result.readyAfterChecks).toBe(false)
    })

    it('readyAfterChecks false quando ainda nao confirmou a perna', () => {
        const result = transferReadyAfterChecks({ isPickup: false, delivered: false, needsCheck: false })
        expect(result.readyAfterChecks).toBe(false)
    })

    // O par sharedType/isPickup e o ponto mais perigoso deste fluxo: e o unico
    // com requirements dinamico. Se isPickup for invertido ou sharedType for
    // fixado num valor constante, a perna de coleta passa a ler os requisitos
    // de entrega (ou vice-versa) sem o tsc ou a suite denunciarem — os dois
    // sao 'coleta' | 'entrega' validos dos dois jeitos. Estes dois testes sao
    // a unica rede contra essa inversao.
    it('perna de coleta (isPickup true) sempre le o bucket "coleta"', () => {
        const result = transferReadyAfterChecks({ isPickup: true, delivered: true, needsCheck: false })
        expect(result.sharedType).toBe('coleta')
    })

    it('perna de entrega (isPickup false) sempre le o bucket "entrega"', () => {
        const result = transferReadyAfterChecks({ isPickup: false, delivered: true, needsCheck: false })
        expect(result.sharedType).toBe('entrega')
    })
})
