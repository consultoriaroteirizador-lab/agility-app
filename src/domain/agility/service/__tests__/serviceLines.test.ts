import type { ServiceLine } from '../dto/response/service-line.response'
import { ServiceType } from '../dto/types'
import { hasPickupLines, lineGroups, lineRoute, linesTitle, serviceLines, splitByDirection } from '../serviceLines'

function linha(over: Partial<ServiceLine>): ServiceLine {
    return { id: 'l', material: 'Item', quantity: 1, status: 'PENDING', createdAt: '', updatedAt: '', ...over } as ServiceLine
}

const SEM_DIRECAO = linha({ id: 'a' })
const ENTREGA = linha({ id: 'c', direction: 'DELIVERY' })
const RECOLHER = linha({ id: 'b', direction: 'PICKUP' })

const PEDIDOS = [ServiceType.DELIVERY, ServiceType.PICKUP, ServiceType.TRANSFER, ServiceType.RETURN, null] as const

describe('serviceLines', () => {
    it('SERVICE lê materials e ignora items', () => {
        expect(serviceLines({ serviceType: ServiceType.SERVICE, materials: [SEM_DIRECAO], items: [RECOLHER] })).toEqual([SEM_DIRECAO])
    })

    it('SERVICE sem materials: null, mesmo com items', () => {
        expect(serviceLines({ serviceType: ServiceType.SERVICE, items: [RECOLHER] })).toBeNull()
    })

    it.each(PEDIDOS)('pedido (%s) lê items antes de materials', (serviceType) => {
        expect(serviceLines({ serviceType, items: [SEM_DIRECAO], materials: [RECOLHER] })).toEqual([SEM_DIRECAO])
    })

    it('pedido só com materials (antes da fase 4): lê materials', () => {
        expect(serviceLines({ serviceType: ServiceType.DELIVERY, materials: [RECOLHER] })).toEqual([RECOLHER])
    })

    it('pedido só com items (formato da fase 4): lê items', () => {
        expect(serviceLines({ serviceType: ServiceType.DELIVERY, items: [ENTREGA] })).toEqual([ENTREGA])
    })

    it('items vazio vale: não cai para materials', () => {
        expect(serviceLines({ serviceType: ServiceType.DELIVERY, items: [], materials: [ENTREGA] })).toEqual([])
    })

    it('sem linhas na resposta, ou sem resposta: null', () => {
        expect(serviceLines({ serviceType: ServiceType.DELIVERY })).toBeNull()
        expect(serviceLines(null)).toBeNull()
        expect(serviceLines(undefined)).toBeNull()
    })
})

describe('splitByDirection', () => {
    it('a linha sem direção é entrega; PICKUP vai para pickup; a ordem se mantém', () => {
        expect(splitByDirection([SEM_DIRECAO, RECOLHER, ENTREGA])).toEqual({ delivery: [SEM_DIRECAO, ENTREGA], pickup: [RECOLHER] })
    })
})

describe('hasPickupLines', () => {
    it('true só com linha PICKUP', () => {
        expect(hasPickupLines({ serviceType: ServiceType.DELIVERY, items: [ENTREGA, RECOLHER] })).toBe(true)
        expect(hasPickupLines({ serviceType: ServiceType.DELIVERY, items: [ENTREGA, SEM_DIRECAO] })).toBe(false)
        expect(hasPickupLines({ serviceType: ServiceType.DELIVERY })).toBe(false)
        expect(hasPickupLines(null)).toBe(false)
    })
})

describe('lineRoute', () => {
    it.each(PEDIDOS)('pedido (%s) usa /items', (serviceType) => {
        expect(lineRoute(serviceType)).toBe('items')
    })

    it('SERVICE usa /materials', () => {
        expect(lineRoute(ServiceType.SERVICE)).toBe('materials')
    })
})

describe('linesTitle', () => {
    it('pedido: Itens, e Item com uma linha', () => {
        expect(linesTitle(ServiceType.DELIVERY)).toBe('Itens')
        expect(linesTitle(ServiceType.DELIVERY, 3)).toBe('Itens')
        expect(linesTitle(ServiceType.PICKUP, 1)).toBe('Item')
        expect(linesTitle(null, 1)).toBe('Item')
        expect(linesTitle(null)).toBe('Itens')
    })

    it('SERVICE: Equipamentos, e Equipamento com uma linha', () => {
        expect(linesTitle(ServiceType.SERVICE)).toBe('Equipamentos')
        expect(linesTitle(ServiceType.SERVICE, 2)).toBe('Equipamentos')
        expect(linesTitle(ServiceType.SERVICE, 1)).toBe('Equipamento')
    })
})

describe('lineGroups', () => {
    it.each([
        [ServiceType.DELIVERY, 'Entregar'],
        [ServiceType.PICKUP, 'Coletar'],
        [ServiceType.TRANSFER, 'Transportar'],
        [ServiceType.RETURN, 'Devolver'],
        [null, 'Entregar'],
    ])('o grupo principal de %s se chama %s', (serviceType, titulo) => {
        expect(lineGroups([ENTREGA, SEM_DIRECAO], serviceType)).toEqual([{ title: titulo, lines: [ENTREGA, SEM_DIRECAO] }])
    })

    it('PICKUP vira "Recolher", depois do principal', () => {
        expect(lineGroups([RECOLHER, ENTREGA], ServiceType.DELIVERY)).toEqual([
            { title: 'Entregar', lines: [ENTREGA] },
            { title: 'Recolher', lines: [RECOLHER] },
        ])
    })

    it('só aparece o grupo que tem linha', () => {
        expect(lineGroups([RECOLHER], ServiceType.DELIVERY)).toEqual([{ title: 'Recolher', lines: [RECOLHER] }])
    })

    it('SERVICE: um grupo só, "Equipamentos", mesmo com PICKUP', () => {
        expect(lineGroups([ENTREGA, RECOLHER], ServiceType.SERVICE)).toEqual([{ title: 'Equipamentos', lines: [ENTREGA, RECOLHER] }])
    })

    it('sem linha: nenhum grupo', () => {
        expect(lineGroups([], ServiceType.DELIVERY)).toEqual([])
        expect(lineGroups(null, ServiceType.SERVICE)).toEqual([])
        expect(lineGroups(undefined, ServiceType.DELIVERY)).toEqual([])
    })
})
