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

    it('code so com espaco e descartado (nao sobrevive so por causa de length > 0 cru)', () => {
        // Sem trim, " ".length > 0 e verdade — a opcao passaria, o motorista
        // selecionaria (code bruto e truthy), e so na conclusao o
        // `validateCompletion` (que usa `!!v?.trim()`) recusaria — tela mentindo
        // que deu certo. Ver comentario em `isValidRelation`.
        const r = resolveRecipientRelations({ delivery: [{ code: '   ', label: 'Alguem' }, { code: 'OK', label: 'Valida' }] })
        expect(r.delivery).toEqual([{ code: 'OK', label: 'Valida' }])
    })

    it('label so com espaco e descartado', () => {
        const r = resolveRecipientRelations({ pickup: [{ code: 'OK', label: '   ' }] })
        expect(r.pickup).toEqual([])
    })

    it('code/label com espacos nas bordas sao gravados ja trimados', () => {
        const r = resolveRecipientRelations({ service: [{ code: '  PORTEIRO  ', label: '  Porteiro  ' }] })
        expect(r.service).toEqual([{ code: 'PORTEIRO', label: 'Porteiro' }])
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
