/**
 * Resumo de carga da oferta — o que o motorista vê ANTES de aceitar.
 *
 * Estas derivações decidem se ele topa ou não a rota, e este repo não tem teste
 * de componente: se `resumirCarga` passar a contar o RETURN como parada de
 * carga, ou se a soma engolir um campo nulo virando `NaN`, a tela mostra número
 * errado em silêncio. Aqui a derivação é pura e coberta.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceType } from '@/domain/agility/service/dto/types'

import { distanciaLinhaReta, resumirCarga } from '../cargaOferta'

function servico(over: Partial<ServiceResponse>): ServiceResponse {
    return { requiresPayment: false, ...over } as unknown as ServiceResponse
}

describe('resumirCarga', () => {
    it('soma peso, cubagem e itens dos serviços da rota', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.DELIVERY, amountWeight: 120.5, amountVolume: 2.4, amountItems: 8 }),
            servico({ serviceType: ServiceType.DELIVERY, amountWeight: 79.5, amountVolume: 1.6, amountItems: 4 }),
        ])

        expect(resumo.pesoKg).toBe(200)
        expect(resumo.volumeM3).toBe(4)
        expect(resumo.itens).toBe(12)
    })

    it('ignora o RETURN, que é o trecho de volta e não uma parada de carga', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.DELIVERY, amountWeight: 100, amountVolume: 2, amountItems: 5 }),
            servico({ serviceType: ServiceType.RETURN, amountWeight: 999, amountVolume: 999, amountItems: 999 }),
        ])

        expect(resumo.pesoKg).toBe(100)
        expect(resumo.volumeM3).toBe(2)
        expect(resumo.itens).toBe(5)
        expect(resumo.composicao).toEqual([{ tipo: ServiceType.DELIVERY, quantidade: 1 }])
    })

    it('trata campo ausente como zero em vez de propagar NaN', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.DELIVERY, amountWeight: null, amountVolume: undefined, amountItems: undefined }),
            servico({ serviceType: ServiceType.DELIVERY, amountWeight: 50, amountVolume: 1, amountItems: 2 }),
        ])

        expect(resumo.pesoKg).toBe(50)
        expect(resumo.volumeM3).toBe(1)
        expect(resumo.itens).toBe(2)
    })

    it('conta a composição por tipo, do mais frequente para o menos', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.PICKUP }),
            servico({ serviceType: ServiceType.DELIVERY }),
            servico({ serviceType: ServiceType.DELIVERY }),
            servico({ serviceType: ServiceType.DELIVERY }),
        ])

        expect(resumo.composicao).toEqual([
            { tipo: ServiceType.DELIVERY, quantidade: 3 },
            { tipo: ServiceType.PICKUP, quantidade: 1 },
        ])
    })

    it('soma a cobrança na entrega só das paradas que exigem pagamento', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.DELIVERY, requiresPayment: true, offerValue: 200 }),
            servico({ serviceType: ServiceType.DELIVERY, requiresPayment: true, offerValue: 140.5 }),
            servico({ serviceType: ServiceType.DELIVERY, requiresPayment: false, offerValue: 999 }),
        ])

        expect(resumo.cobranca).toEqual({ valor: 340.5, paradas: 2 })
    })

    it('soma o valor da mercadoria transportada', () => {
        const resumo = resumirCarga([
            servico({ serviceType: ServiceType.DELIVERY, price: 1500 }),
            servico({ serviceType: ServiceType.DELIVERY, price: null }),
        ])

        expect(resumo.valorCarga).toBe(1500)
    })

    it('devolve resumo zerado para rota sem serviço', () => {
        const resumo = resumirCarga([])

        expect(resumo).toEqual({
            pesoKg: 0,
            volumeM3: 0,
            itens: 0,
            composicao: [],
            valorCarga: 0,
            cobranca: { valor: 0, paradas: 0 },
        })
    })
})

describe('distanciaLinhaReta', () => {
    it('mede a distância entre dois pontos conhecidos', () => {
        // São Paulo → Rio de Janeiro: ~360 km em linha reta.
        const km = distanciaLinhaReta(
            { latitude: -23.5505, longitude: -46.6333 },
            { latitude: -22.9068, longitude: -43.1729 },
        )

        expect(km).toBeGreaterThan(355)
        expect(km).toBeLessThan(365)
    })

    it('é zero quando os dois pontos coincidem', () => {
        const ponto = { latitude: -23.5505, longitude: -46.6333 }

        expect(distanciaLinhaReta(ponto, ponto)).toBe(0)
    })

    it('devolve null quando falta coordenada — sem coordenada não há estimativa', () => {
        const origem = { latitude: -23.5505, longitude: -46.6333 }

        expect(distanciaLinhaReta(null, origem)).toBeNull()
        expect(distanciaLinhaReta(origem, { latitude: null, longitude: -46.6 })).toBeNull()
        expect(distanciaLinhaReta(origem, { latitude: -23.5, longitude: undefined })).toBeNull()
    })
})
