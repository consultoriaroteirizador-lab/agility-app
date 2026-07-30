import type { Parada } from '../../_types/rota.types'
import { findOutrasParadas } from '../routeCalculations'

function parada(over: Partial<Parada> & { serviceId: string }): Parada {
    return {
        numero: 1,
        nome: 'Cliente',
        endereco: 'Rua X',
        horarioInicio: '--:--',
        horarioFim: '--:--',
        tipo: 'Entrega',
        status: 'pendente',
        pedidos: [],
        chaveParada: `addr:1|cli:${over.serviceId}`,
        ...over,
    } as Parada
}

describe('findOutrasParadas', () => {
    it('exclui a próxima parada por serviceId, mesmo sendo outro objeto', () => {
        // Com o agrupamento, `paradas` é reconstruída a cada render: a próxima
        // parada pode ser um objeto DIFERENTE com o mesmo serviceId. Comparar por
        // referência a deixaria aparecer duas vezes na lista, em silêncio.
        const a = parada({ serviceId: 'a' })
        const b = parada({ serviceId: 'b' })
        const proximaClonada = { ...a }

        const outras = findOutrasParadas([a, b], proximaClonada)

        expect(outras.map((p) => p.serviceId)).toEqual(['b'])
    })

    it('sem próxima parada, devolve todas as ativas', () => {
        const a = parada({ serviceId: 'a', status: 'pendente' })
        const b = parada({ serviceId: 'b', status: 'concluida-sucesso' })
        expect(findOutrasParadas([a, b], null).map((p) => p.serviceId)).toEqual(['a'])
    })
})
