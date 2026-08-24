import {
    DEFAULT_RECIPIENT_RELATIONS,
    RECIPIENT_STEP_TITLES,
    relationsForServiceType,
    resolveRecipientRelations,
} from '../recipientRelations'

describe('resolveRecipientRelations', () => {
    it('resposta ausente cai no default de fabrica', () => {
        expect(resolveRecipientRelations(undefined)).toEqual(DEFAULT_RECIPIENT_RELATIONS)
    })

    it('backend antigo (sem o campo) cai no default', () => {
        expect(resolveRecipientRelations(null).delivery).toEqual(DEFAULT_RECIPIENT_RELATIONS.delivery)
    })

    it('lista vazia configurada e respeitada, nao vira default', () => {
        expect(resolveRecipientRelations({ pickup: [] }).pickup).toEqual([])
    })

    it('descarta opcao malformada', () => {
        const r = resolveRecipientRelations({ service: [{ code: 'OK', label: 'Valida' }, { code: 'X' }] })
        expect(r.service).toEqual([{ code: 'OK', label: 'Valida' }])
    })

    it('retorno clonado: mutar objeto nao afeta default', () => {
        const r = resolveRecipientRelations(undefined)
        r.delivery[0].label = 'MUTADO'
        expect(DEFAULT_RECIPIENT_RELATIONS.delivery[0].label).toBe('Cliente')
    })

    it('array com TODOS itens malformados retorna vazio, nao default', () => {
        const r = resolveRecipientRelations({ delivery: [{ code: 'X' }, { label: 'Y' }] })
        expect(r.delivery).toEqual([])
    })
})

describe('relationsForServiceType', () => {
    it('mapeia nome de tela para nome de contrato', () => {
        const r = resolveRecipientRelations({
            delivery: [{ code: 'D', label: 'D' }],
            pickup: [{ code: 'P', label: 'P' }],
            service: [{ code: 'S', label: 'S' }],
        })

        expect(relationsForServiceType(r, 'entrega')[0].code).toBe('D')
        expect(relationsForServiceType(r, 'coleta')[0].code).toBe('P')
        expect(relationsForServiceType(r, 'servico')[0].code).toBe('S')
    })
})

describe('RECIPIENT_STEP_TITLES', () => {
    it('servico pergunta por acompanhante, nao por recebedor', () => {
        expect(RECIPIENT_STEP_TITLES.servico.title).toBe('Quem acompanhou?')
        expect(RECIPIENT_STEP_TITLES.coleta.title).toBe('Quem entregou?')
        expect(RECIPIENT_STEP_TITLES.entrega.title).toBe('Quem recebeu?')
    })
})
