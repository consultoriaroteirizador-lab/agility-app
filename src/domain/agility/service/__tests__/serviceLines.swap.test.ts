import type { EquipmentLookupResponse, ServiceLine } from '../dto/response/service-line.response'
import {
    lookupFoundFor,
    replacedLineLabel,
    replacedLineOf,
    SWAP_DESCRIPTION_REQUIRED,
    swapFormErrors,
    swappableLines,
    swapRequestBody,
} from '../serviceLines'

function linha(over: Partial<ServiceLine>): ServiceLine {
    return { id: 'l', material: 'Item', quantity: 1, status: 'CHECKED', createdAt: '', updatedAt: '', ...over } as ServiceLine
}

const A = linha({ id: 'a', material: 'MODEM A', serialNumber: 'SN-A', status: 'SWAPPED' })
const B = linha({ id: 'b', material: 'MODEM B', serialNumber: 'SN-B', replacesMaterialId: 'a' })
const C = linha({ id: 'c', material: 'MODEM C', serialNumber: 'SN-C', replacesMaterialId: 'b' })

describe('swappableLines (fase 3D, D4)', () => {
    it('só "Levei" (CHECKED) com quantidade 1', () => {
        const levei = linha({ id: '1' })
        const pendente = linha({ id: '2', status: 'PENDING' })
        const duas = linha({ id: '3', quantity: 2 })
        const trocada = linha({ id: '4', status: 'SWAPPED' })
        const danificada = linha({ id: '5', status: 'DAMAGED' })
        expect(swappableLines([levei, pendente, duas, trocada, danificada])).toEqual([levei])
    })

    it('a B de uma troca também é trocável (cadeia A→B→C)', () => {
        expect(swappableLines([A, B])).toEqual([B])
    })

    it('sem linhas: lista vazia', () => {
        expect(swappableLines(null)).toEqual([])
        expect(swappableLines(undefined)).toEqual([])
    })
})

describe('replacedLineOf e replacedLineLabel (fase 3D, D1)', () => {
    it('B aponta A; A não é troca', () => {
        expect(replacedLineOf([A, B], B)).toBe(A)
        expect(replacedLineOf([A, B], A)).toBeNull()
        expect(replacedLineLabel([A, B], A)).toBeNull()
    })

    it('o texto leva o nome e a série da A', () => {
        expect(replacedLineLabel([A, B], B)).toBe('No lugar de: MODEM A (S/N SN-A)')
    })

    it('cadeia: C aponta B', () => {
        expect(replacedLineOf([A, B, C], C)).toBe(B)
        expect(replacedLineLabel([A, B, C], C)).toBe('No lugar de: MODEM B (S/N SN-B)')
    })

    // Review Focus 5
    it('A sem série: só o nome, sem "(S/N …)"', () => {
        expect(replacedLineLabel([{ ...A, serialNumber: null }, B], B)).toBe('No lugar de: MODEM A')
        expect(replacedLineLabel([{ ...A, serialNumber: '' }, B], B)).toBe('No lugar de: MODEM A')
    })

    it('A fora da lista: nada', () => {
        expect(replacedLineOf([B], B)).toBeNull()
        expect(replacedLineLabel([B], B)).toBeNull()
        expect(replacedLineLabel(null, B)).toBeNull()
    })
})

describe('lookupFoundFor (fase 3D)', () => {
    const achado: EquipmentLookupResponse = { found: true, code: 'MOD-NOVO', name: 'MODEM NOVO', unit: 'un' }
    const naoAchado: EquipmentLookupResponse = { found: false, code: 'LIVRE-1' }

    it('vale para o código do campo, comparado sem espaços nas pontas (como o backend)', () => {
        expect(lookupFoundFor(' MOD-NOVO ', achado)).toBe(true)
        expect(lookupFoundFor('LIVRE-1', naoAchado)).toBe(false)
    })

    // Review Focus 3
    it('código mudado depois da consulta: não consultado (null)', () => {
        expect(lookupFoundFor('MOD-NOV', achado)).toBeNull()
        expect(lookupFoundFor('LIVRE-2', naoAchado)).toBeNull()
    })

    it('sem consulta: null', () => {
        expect(lookupFoundFor('MOD-NOVO', null)).toBeNull()
        expect(lookupFoundFor('MOD-NOVO', undefined)).toBeNull()
    })
})

describe('swapFormErrors (fase 3D, D3)', () => {
    const ok = { code: 'MOD-NOVO', serialNumber: 'SN-B', found: true, description: '' }

    it('código e série preenchidos, código no cadastro: sem erro', () => {
        expect(swapFormErrors(ok)).toEqual({})
    })

    it('código e série só com espaços: os dois erros', () => {
        expect(swapFormErrors({ ...ok, code: '  ', serialNumber: ' ' })).toEqual({ code: 'Informe o código', serialNumber: 'Informe o nº de série' })
    })

    it('fora do cadastro sem descrição: pede a descrição', () => {
        expect(swapFormErrors({ ...ok, found: false, description: '   ' })).toEqual({ description: SWAP_DESCRIPTION_REQUIRED })
        expect(SWAP_DESCRIPTION_REQUIRED).toBe('Código não cadastrado: informe a descrição')
    })

    it('fora do cadastro com descrição: sem erro', () => {
        expect(swapFormErrors({ ...ok, found: false, description: 'Roteador X' })).toEqual({})
    })

    it('não consultado: a descrição não é exigida aqui (quem envia consulta antes)', () => {
        expect(swapFormErrors({ ...ok, found: null })).toEqual({})
    })
})

describe('swapRequestBody (fase 3D)', () => {
    it('apara tudo; descrição e motivo vazios não vão', () => {
        expect(swapRequestBody({ code: ' MOD-NOVO ', serialNumber: ' SN-B ', description: '  ', reason: '' }))
            .toEqual({ code: 'MOD-NOVO', serialNumber: 'SN-B' })
    })

    it('descrição e motivo preenchidos vão aparados', () => {
        expect(swapRequestBody({ code: 'LIVRE-1', serialNumber: 'SN-B', description: ' Roteador X ', reason: ' não ligava ' }))
            .toEqual({ code: 'LIVRE-1', serialNumber: 'SN-B', description: 'Roteador X', reason: 'não ligava' })
    })
})
