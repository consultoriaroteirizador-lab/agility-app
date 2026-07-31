import type { RouteNonDeliveredItemResponse } from '@/domain/agility/routing/dto'
import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceType } from '@/domain/agility/service/dto/types'

import type { Parada } from '../../_types/rota.types'
import { collectLiveServiceIds, countParadasByStatus, findOutrasParadas, findParadasConcluidasInsucesso, getParadasOrdenadas, hasMultipleParadasEmAndamento, mapServicesToParadas, resolvePedidosDaParada, withLedgerNonDelivered } from '../routeCalculations'
import { buildInsucessoList, countLedgerOnly } from '../routeNonDelivered'
import { pathForServiceType } from '../statusMappers'
import { findGrupoDoServico, groupContiguousStops } from '../stopGrouping'

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

// `status` aqui aceita string solta (não só `ServiceStatus`) porque os testes
// abaixo montam overrides com valores crus ('COMPLETED', 'FAILED', ...) — mais
// perto do que o backend manda na prática do que o enum tipado.
type PedidoOverrides = Partial<Omit<ServiceResponse, 'status'>> & { status?: string }

function pedido(over: PedidoOverrides & { id: string }): ServiceResponse {
    return {
        addressId: 'addr-1',
        customerId: 'cli-1',
        fantasyName: 'SAO LUIZ CRATO',
        responsible: null,
        serviceType: ServiceType.DELIVERY,
        status: 'PENDING',
        isPending: true,
        isInProgress: false,
        isInAttendance: false,
        isCompleted: false,
        isCanceled: false,
        isFailed: false,
        sequenceOrder: 0,
        address: { formattedAddress: 'Rua X, 100' },
        ...over,
    } as unknown as ServiceResponse
}

describe('mapServicesToParadas — agrupamento', () => {
    it('5 pedidos contíguos na mesma porta → 1 parada com 5 pedidos', () => {
        const services = [0, 1, 2, 3, 4].map((i) => pedido({ id: `n${i}`, sequenceOrder: i }))
        const paradas = mapServicesToParadas(services)

        expect(paradas).toHaveLength(1)
        expect(paradas[0].pedidos).toHaveLength(5)
        expect(paradas[0].numero).toBe(1)
        // serviceId é o do REPRESENTANTE (primeiro do grupo) — invariante aditiva.
        expect(paradas[0].serviceId).toBe('n0')
    })

    it('2 clientes no mesmo endereço → 2 paradas (dois recebedores, dois canhotos)', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, customerId: 'cli-1' }),
            pedido({ id: 'b', sequenceOrder: 1, customerId: 'cli-2' }),
        ])
        expect(paradas).toHaveLength(2)
        expect(paradas.map((p) => p.numero)).toEqual([1, 2])
    })

    it('rota legada (não contíguos) → 2 paradas, e ambas marcadas como endereço repetido', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0 }),
            pedido({ id: 'meio', sequenceOrder: 1, addressId: 'addr-2', customerId: 'cli-2' }),
            pedido({ id: 'b', sequenceOrder: 2 }),
        ])
        expect(paradas).toHaveLength(3)
        expect(paradas[0].enderecoRepetido).toBe(true)
        expect(paradas[1].enderecoRepetido).toBeFalsy()
        expect(paradas[2].enderecoRepetido).toBe(true)
    })

    it('parada de 1 pedido continua idêntica ao comportamento atual', () => {
        const [parada] = mapServicesToParadas([pedido({ id: 'unico', sequenceOrder: 0 })])
        expect(parada.serviceId).toBe('unico')
        expect(parada.pedidos).toHaveLength(1)
        expect(parada.status).toBe('pendente')
        expect(parada.enderecoRepetido).toBeFalsy()
    })
})

describe('status agregado da parada (§3.2 / §3.3)', () => {
    const grupoCom = (overrides: PedidoOverrides[]) =>
        mapServicesToParadas(overrides.map((o, i) => pedido({ id: `n${i}`, sequenceOrder: i, ...o })))[0]

    it('4 entregues + 1 pendente → parada PENDENTE (só fecha quando todas fecharem)', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isPending: true },
        ])
        expect(parada.status).toBe('pendente')
    })

    it('algum em atendimento vence algum em andamento', () => {
        const parada = grupoCom([
            { isInProgress: true, isPending: false, status: 'IN_PROGRESS' },
            { isInAttendance: true, isPending: false, status: 'IN_ATTENDANCE' },
        ])
        expect(parada.status).toBe('em-atendimento')
    })

    it('todas entregues → concluída com sucesso', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
        ])
        expect(parada.status).toBe('concluida-sucesso')
    })

    it('3 entregues + 2 insucesso → grupo misto cai em INSUCESSO', () => {
        const parada = grupoCom([
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isCompleted: true, isPending: false, status: 'COMPLETED' },
            { isFailed: true, isPending: false, status: 'FAILED' },
            { isFailed: true, isPending: false, status: 'FAILED' },
        ])
        expect(parada.status).toBe('concluida-insucesso')
        expect(parada.pedidos.filter((p) => p.isCompleted).length).toBe(3)
    })
})

describe('janela de tempo da parada (§3.4)', () => {
    it('exibe a mais restritiva do grupo: último início e primeiro fim', () => {
        const [parada] = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, promisedStartDate: '2026-07-30T08:00:00.000Z', promisedEndDate: '2026-07-30T18:00:00.000Z' }),
            pedido({ id: 'b', sequenceOrder: 1, promisedStartDate: '2026-07-30T10:00:00.000Z', promisedEndDate: '2026-07-30T12:00:00.000Z' }),
        ])
        expect(parada.promisedStartISO).toBe('2026-07-30T10:00:00.000Z')
        expect(parada.promisedEndISO).toBe('2026-07-30T12:00:00.000Z')
    })

    it('ignora nulos; sem nenhuma janela no grupo, fica null', () => {
        const [parada] = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, promisedStartDate: null, promisedEndDate: null }),
            pedido({ id: 'b', sequenceOrder: 1, promisedStartDate: null, promisedEndDate: '2026-07-30T12:00:00.000Z' }),
        ])
        expect(parada.promisedStartISO).toBeNull()
        expect(parada.promisedEndISO).toBe('2026-07-30T12:00:00.000Z')
    })
})

describe('resolvePedidosDaParada — fonte única entre a tela (índice de notas) e o gate de "uma por vez"', () => {
    it('devolve o grupo contíguo inteiro para qualquer id-membro (5 notas na mesma porta → todas as 5, seja qual for o id perguntado)', () => {
        const services = [0, 1, 2, 3, 4].map((i) => pedido({ id: `n${i}`, sequenceOrder: i }))

        for (const alvo of services) {
            expect(resolvePedidosDaParada(services, alvo.id).map((s) => s.id)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'])
        }
    })

    it('serviceId desconhecido → []', () => {
        const services = [pedido({ id: 'a', sequenceOrder: 0 })]
        expect(resolvePedidosDaParada(services, 'zzz')).toEqual([])
    })

    it('paridade: o grupo que a tela vê é IDÊNTICO ao que o gate de "uma por vez" vê, mesmo com sequenceOrder nulo misturado a numerado', () => {
        // Antes desta correção, a tela (index.tsx) e o gate (useStopStatus)
        // ordenavam com fallbacks DIFERENTES para pedido sem sequenceOrder (999
        // vs Number.MAX_SAFE_INTEGER) — duas fontes podiam discordar sobre o que
        // é "uma parada". Este teste fixa que os dois lados passam pelo MESMO
        // `getParadasOrdenadas`: resolvePedidosDaParada (usado pela tela) contra
        // a composição order→group→find que o gate usa internamente.
        const services = [
            pedido({ id: 'a', sequenceOrder: 2 }),
            pedido({ id: 'b', sequenceOrder: null }),
            pedido({ id: 'c', sequenceOrder: 1 }),
        ]

        const daTela = resolvePedidosDaParada(services, 'b').map((s) => s.id)
        const doGate = (findGrupoDoServico(groupContiguousStops(getParadasOrdenadas(services)), 'b') ?? []).map((s) => s.id)

        expect(daTela).toEqual(doGate)
        expect(daTela).toEqual(['c', 'a', 'b'])
    })
})

describe('pathForServiceType', () => {
    it('DELIVERY → tela de entrega', () => {
        expect(pathForServiceType(ServiceType.DELIVERY)).toBe('/rotas-detalhadas/[id]/parada/[pid]/entrega')
    })

    it('PICKUP → tela de coleta', () => {
        expect(pathForServiceType(ServiceType.PICKUP)).toBe('/rotas-detalhadas/[id]/parada/[pid]/coleta')
    })

    it('SERVICE → tela de serviço', () => {
        expect(pathForServiceType(ServiceType.SERVICE)).toBe('/rotas-detalhadas/[id]/parada/[pid]/service')
    })

    it('tipo desconhecido/nulo → default de entrega (mesmo fallback do índice de notas)', () => {
        expect(pathForServiceType(null)).toBe('/rotas-detalhadas/[id]/parada/[pid]/entrega')
        expect(pathForServiceType('QUALQUER_OUTRO')).toBe('/rotas-detalhadas/[id]/parada/[pid]/entrega')
    })
})

describe('hasMultipleParadasEmAndamento', () => {
    it('duas notas da MESMA porta em andamento não são "múltiplas paradas"', () => {
        // Antes do agrupamento isto disparava falso positivo o tempo todo durante
        // o atendimento de uma porta com várias notas.
        const paradas = mapServicesToParadas([
            pedido({ id: 'a', sequenceOrder: 0, isInProgress: true, isPending: false, status: 'IN_PROGRESS' }),
            pedido({ id: 'b', sequenceOrder: 1, isInProgress: true, isPending: false, status: 'IN_PROGRESS' }),
        ])
        expect(paradas).toHaveLength(1)
        expect(hasMultipleParadasEmAndamento(paradas)).toBe(false)
    })
})

describe('contagem de paradas e de notas', () => {
    it('conta paradas e notas separadamente (26 paradas, 56 notas)', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'a0', sequenceOrder: 0, isCompleted: true, isPending: false, status: 'COMPLETED' }),
            pedido({ id: 'a1', sequenceOrder: 1, isCompleted: true, isPending: false, status: 'COMPLETED' }),
            pedido({ id: 'b0', sequenceOrder: 2, addressId: 'addr-2', customerId: 'cli-2' }),
        ])
        const contagem = countParadasByStatus(paradas)

        expect(contagem.total).toBe(2)
        expect(contagem.concluidas).toBe(1)
        expect(contagem.notasTotal).toBe(3)
        expect(contagem.notasConcluidas).toBe(2)
    })

    it('pedido que saiu da rota (ledger) conta como 1 parada e 1 nota', () => {
        const base = countParadasByStatus([])
        const comLedger = withLedgerNonDelivered(base, 2)
        expect(comLedger.total).toBe(2)
        expect(comLedger.notasTotal).toBe(2)
        expect(comLedger.notasConcluidas).toBe(2)
    })

    it('parada concluída sem `pedidos` usa o status da própria parada como fallback: 1 de 1 nota, não 0 de 1', () => {
        // parada() não popula `pedidos` com itens (fica []), simulando dado que não
        // carrega o campo. O numerador (notasConcluidas) precisa concordar com o
        // denominador (notasTotal) sobre o que "1 nota" significa aqui — senão o
        // "X de Y notas" que o cliente lê mente sem erro nenhum.
        const p = parada({ serviceId: 'sem-pedidos', status: 'concluida-sucesso' })
        const contagem = countParadasByStatus([p])
        expect(contagem.notasTotal).toBe(1)
        expect(contagem.notasConcluidas).toBe(1)
    })

    it('parada pendente sem `pedidos` conta 1 nota no total mas 0 concluída', () => {
        const p = parada({ serviceId: 'sem-pedidos-pendente', status: 'pendente' })
        const contagem = countParadasByStatus([p])
        expect(contagem.notasTotal).toBe(1)
        expect(contagem.notasConcluidas).toBe(0)
    })

    it('nota cancelada conta como concluída no numerador', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'c0', sequenceOrder: 0, isCanceled: true, isPending: false, status: 'CANCELED' }),
        ])
        expect(countParadasByStatus(paradas).notasConcluidas).toBe(1)
    })

    it('nota com insucesso (isFailed) conta como concluída no numerador', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'f0', sequenceOrder: 0, isFailed: true, isPending: false, status: 'FAILED' }),
        ])
        expect(countParadasByStatus(paradas).notasConcluidas).toBe(1)
    })
})

// ============================================================================
// LEDGER DE NÃO-ENTREGUES × PARADA AGRUPADA
// ============================================================================

/**
 * O dedup do ledger conta "pedidos que saíram da rota" = os que NÃO têm mais
 * parada viva. Antes do agrupamento cada pedido era a sua própria `Parada`, então
 * o `serviceId` da parada bastava como identidade. Com o agrupamento
 * `parada.serviceId` é só o REPRESENTANTE (`pedidos[0]`) — as notas 2..N ficavam
 * invisíveis ao dedup e eram contadas como "saíram da rota" mesmo estando ali,
 * na mesma porta, na tela.
 *
 * Um pedido com insucesso mantém o `routingId` E aparece no ledger (é o caso que
 * `routeNonDelivered.test.ts` já cobre para o dedup), então isto NÃO é borda: é
 * o caminho comum de "motorista recusa uma nota de uma porta com várias".
 */
function ledgerItem(
    over: Partial<RouteNonDeliveredItemResponse> & { serviceId: string },
): RouteNonDeliveredItemResponse {
    return {
        serviceCode: 'COD-000',
        recipientName: 'Cliente Ledger',
        address: 'Rua Ledger, 200',
        kind: 'ORDER_FAILURE',
        outcome: 'FAILED',
        reasonName: 'Recusado pelo cliente',
        currentStatus: null,
        occurredAt: '2026-07-30T12:00:00.000Z',
        ...over,
    }
}

/** Porta de 5 notas; a nota `n2` fecha em insucesso, as outras conforme `resto`. */
function portaDe5ComN2EmInsucesso(resto: PedidoOverrides) {
    return [0, 1, 2, 3, 4].map((i) =>
        pedido({
            id: `n${i}`,
            sequenceOrder: i,
            ...(i === 2
                ? { isFailed: true, isPending: false, status: 'FAILED' }
                : resto),
        }),
    )
}

describe('dedup do ledger com parada agrupada', () => {
    it('grupo de 5 com 1 nota em insucesso (ainda pendente) → 1 parada e 5 notas, não 2 e 6', () => {
        const services = portaDe5ComN2EmInsucesso({ isPending: true })
        const paradas = mapServicesToParadas(services)
        const ledger = [ledgerItem({ serviceId: 'n2' })]

        expect(paradas).toHaveLength(1)
        expect(paradas[0].status).toBe('pendente')

        const contagem = withLedgerNonDelivered(
            countParadasByStatus(paradas),
            countLedgerOnly(collectLiveServiceIds(paradas), ledger),
        )

        expect(contagem.total).toBe(1)
        expect(contagem.notasTotal).toBe(5)
        expect(contagem.concluidas).toBe(0)
        expect(contagem.notasConcluidas).toBe(1)

        // Prova do defeito que isto corrige: a derivação antiga passava só o
        // `serviceId` das paradas de INSUCESSO. Aqui a parada é pendente (a porta
        // não fechou), então a lista ia vazia, a nota `n2` parecia ter saído da
        // rota e a tela lia "1 de 2 paradas · 2 de 6 notas" numa rota de 1 parada
        // e 5 notas.
        const derivacaoAntiga = findParadasConcluidasInsucesso(paradas).map((p) => p.serviceId)
        const contagemAntiga = withLedgerNonDelivered(
            countParadasByStatus(paradas),
            countLedgerOnly(derivacaoAntiga, ledger),
        )
        expect(contagemAntiga.total).toBe(2)
        expect(contagemAntiga.notasTotal).toBe(6)
    })

    it('paridade com o histórico: a mesma rota conta igual nas duas telas', () => {
        // `menu/historico/[routeId]` passa TODOS os ids de serviço ao dedup; a tela
        // da rota ao vivo passa as paradas. Enquanto as duas derivações não
        // concordarem, a mesma rota reporta números diferentes em cada tela.
        const services = portaDe5ComN2EmInsucesso({ isPending: true })
        const paradas = mapServicesToParadas(services)
        const ledger = [ledgerItem({ serviceId: 'n2' }), ledgerItem({ serviceId: 'saiu-da-rota', outcome: 'CANCELED' })]

        expect(countLedgerOnly(collectLiveServiceIds(paradas), ledger)).toBe(
            countLedgerOnly(services.map((s) => s.id), ledger),
        )
        expect(countLedgerOnly(collectLiveServiceIds(paradas), ledger)).toBe(1)
    })

    it('parada sem `pedidos` (dado não carregado) ainda expõe o representante ao dedup', () => {
        const p = parada({ serviceId: 'so-representante', pedidos: [] })
        expect(collectLiveServiceIds([p])).toEqual(['so-representante'])
    })
})

describe('lista de insucesso com parada agrupada (§3.3)', () => {
    it('grupo misto (4 entregues + 1 insucesso) → UMA linha da porta, com "4 de 5", sem linha fantasma da nota', () => {
        const services = portaDe5ComN2EmInsucesso({ isCompleted: true, isPending: false, status: 'COMPLETED' })
        const paradas = mapServicesToParadas(services)
        const ledger = [ledgerItem({ serviceId: 'n2', reasonName: 'Endereço não encontrado' })]

        expect(paradas[0].status).toBe('concluida-insucesso')

        const rows = buildInsucessoList(findParadasConcluidasInsucesso(paradas), ledger)

        // Antes: 2 linhas — a da porta (chaveada no representante `n0`, que na
        // verdade foi ENTREGUE) e a da nota `n2` vinda do ledger.
        expect(rows).toHaveLength(1)
        expect(rows[0].serviceId).toBe('n0')
        // O desfecho/motivo continuam vindo do ledger, que é a fonte da verdade.
        expect(rows[0].outcome).toBe('FAILED')
        expect(rows[0].reasonName).toBe('Endereço não encontrado')
        // E a linha carrega o recorte do §3.3: "4 de 5 entregues".
        expect(rows[0].totalNotas).toBe(5)
        expect(rows[0].notasEntregues).toBe(4)
    })

    it('contador e lista não divergem: uma linha por parada de insucesso + uma por pedido que saiu da rota', () => {
        const services = portaDe5ComN2EmInsucesso({ isCompleted: true, isPending: false, status: 'COMPLETED' })
        const paradas = mapServicesToParadas(services)
        const ledger = [
            ledgerItem({ serviceId: 'n2' }),
            ledgerItem({ serviceId: 'fora-1', outcome: 'CANCELED' }),
            ledgerItem({ serviceId: 'fora-2', outcome: 'RETURNED_TO_POOL' }),
        ]

        const contagem = withLedgerNonDelivered(
            countParadasByStatus(paradas),
            countLedgerOnly(collectLiveServiceIds(paradas), ledger),
        )
        const rows = buildInsucessoList(findParadasConcluidasInsucesso(paradas), ledger)

        expect(rows).toHaveLength(contagem.concluidasInsucesso)
        expect(contagem.total).toBe(3)
        expect(contagem.notasTotal).toBe(7)
    })

    it('parada de insucesso de UMA nota continua idêntica ao comportamento anterior', () => {
        const paradas = mapServicesToParadas([
            pedido({ id: 'unico', sequenceOrder: 0, isFailed: true, isPending: false, status: 'FAILED' }),
        ])
        const rows = buildInsucessoList(
            findParadasConcluidasInsucesso(paradas),
            [ledgerItem({ serviceId: 'unico', serviceCode: 'COD-9' })],
        )

        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ serviceId: 'unico', code: 'COD-9', outcome: 'FAILED' })
        expect(rows[0].totalNotas).toBe(1)
    })
})
