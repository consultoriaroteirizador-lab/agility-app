/**
 * Derivações de EXIBIÇÃO da parada agrupada (§8 da spec).
 *
 * Os dois itens da lista de aceite que são texto puro na tela — o selo de notas
 * do card (`N notas` / `3 de 5 entregues`) e a linha de progresso (`X de Y
 * paradas · N de M notas`) — moravam dentro de componentes, e este repo não tem
 * teste de componente. Um refactor de `isGrupoMisto` ou da condição
 * `notasTotal > total` regredia em silêncio. Aqui a derivação é pura e coberta.
 */
import type { ServiceResponse } from '@/domain/agility/service/dto'
import { ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types'

import type { ParadaStatus } from '../../_types/rota.types'
import {
    formatResumoDaNota,
    resolveNotaFiscalLabel,
    resolveNotasBadge,
    resolveParadaAtendida,
    resolveParadaAtendidaElegivel,
    resolveProgressoTexto,
    resolveTemEtapaPropriaAntesDoAtendimento,
} from '../paradaDisplay'
import type { ParadaCountResult } from '../routeCalculations'

function nota(over: Partial<ServiceResponse> & { id: string }): ServiceResponse {
    return { isCompleted: false, ...over } as unknown as ServiceResponse
}

function paradaCom(status: ParadaStatus, pedidos: ServiceResponse[]) {
    return { status, pedidos }
}

function contagem(over: Partial<ParadaCountResult>): ParadaCountResult {
    return {
        total: 0,
        pendentes: 0,
        emAndamento: 0,
        concluidasSucesso: 0,
        concluidasInsucesso: 0,
        concluidas: 0,
        notasTotal: 0,
        notasConcluidas: 0,
        ...over,
    }
}

describe('resolveNotasBadge — selo de notas do card da parada', () => {
    it('parada de 1 nota não exibe selo (comportamento idêntico ao de antes do agrupamento)', () => {
        const badge = resolveNotasBadge(paradaCom('pendente', [nota({ id: 'a' })]))
        expect(badge.totalNotas).toBe(1)
        expect(badge.label).toBeNull()
    })

    it('5 notas na mesma porta → "5 notas"', () => {
        const badge = resolveNotasBadge(
            paradaCom('pendente', [0, 1, 2, 3, 4].map((i) => nota({ id: `n${i}` }))),
        )
        expect(badge.totalNotas).toBe(5)
        expect(badge.isGrupoMisto).toBe(false)
        expect(badge.label).toBe('5 notas')
    })

    it('grupo MISTO (3 entregues, 2 insucesso) → "3 de 5 entregues" (§3.3)', () => {
        const pedidos = [
            nota({ id: 'a', isCompleted: true }),
            nota({ id: 'b', isCompleted: true }),
            nota({ id: 'c', isCompleted: true }),
            nota({ id: 'd', isFailed: true }),
            nota({ id: 'e', isFailed: true }),
        ]
        const badge = resolveNotasBadge(paradaCom('concluida-insucesso', pedidos))
        expect(badge.notasEntregues).toBe(3)
        expect(badge.isGrupoMisto).toBe(true)
        expect(badge.label).toBe('3 de 5 entregues')
    })

    it('insucesso TOTAL (0 entregues) não é misto → volta ao selo de contagem', () => {
        const pedidos = [nota({ id: 'a', isFailed: true }), nota({ id: 'b', isFailed: true })]
        const badge = resolveNotasBadge(paradaCom('concluida-insucesso', pedidos))
        expect(badge.isGrupoMisto).toBe(false)
        expect(badge.label).toBe('2 notas')
    })

    it('parada sem `pedidos` conta 1 nota e não exibe selo — mesmo fallback de countParadasByStatus', () => {
        expect(resolveNotasBadge({ status: 'pendente', pedidos: [] })).toMatchObject({
            totalNotas: 1,
            notasEntregues: 0,
            label: null,
        })
        expect(resolveNotasBadge({ status: 'pendente' })).toMatchObject({ totalNotas: 1, label: null })
    })
})

describe('resolveProgressoTexto — linha de progresso da rota', () => {
    it('com notas a mais que paradas, separa as duas grandezas (26 portas, 56 notas)', () => {
        expect(
            resolveProgressoTexto(contagem({ total: 26, concluidas: 12, notasTotal: 56, notasConcluidas: 34 })),
        ).toBe('12 de 26 paradas · 34 de 56 notas')
    })

    it('1 nota por parada → texto curto de sempre (nenhuma empresa nova vê jargão novo)', () => {
        expect(
            resolveProgressoTexto(contagem({ total: 10, concluidas: 3, notasTotal: 10, notasConcluidas: 3 })),
        ).toBe('3 de 10 concluídas')
    })

    it('rota vazia não quebra', () => {
        expect(resolveProgressoTexto(contagem({}))).toBe('0 de 0 concluídas')
    })
})

describe('resolveNotaFiscalLabel — o número que o motorista tem no papel', () => {
    it('usa invoicing (a nota fiscal), não o código interno do sistema', () => {
        expect(
            resolveNotaFiscalLabel({ invoicing: 'NF-12354', identificationCode: 'ARA-260513-1542-WMFR' }),
        ).toBe('NF-12354')
    })

    it('prefixa NF quando o valor vem só como número', () => {
        expect(resolveNotaFiscalLabel({ invoicing: '12354' })).toBe('NF 12354')
    })

    it('não duplica o prefixo quando o valor já o traz', () => {
        expect(resolveNotaFiscalLabel({ invoicing: 'nf 998' })).toBe('nf 998')
    })

    it('sem nota fiscal, cai para o código interno em vez de deixar o card sem identidade', () => {
        expect(resolveNotaFiscalLabel({ identificationCode: 'ARA-260513-1542-WMFR' }))
            .toBe('ARA-260513-1542-WMFR')
    })

    it('não chama de NF o que não é: o código interno entra cru, sem prefixo', () => {
        expect(resolveNotaFiscalLabel({ invoicing: null, identificationCode: '998' })).toBe('998')
    })

    it('sem nenhum dos dois → null (o card usa o ordinal da nota)', () => {
        expect(resolveNotaFiscalLabel({})).toBeNull()
        expect(resolveNotaFiscalLabel(null)).toBeNull()
        expect(resolveNotaFiscalLabel({ invoicing: '   ' })).toBeNull()
    })
})

describe('resolveParadaAtendida — a PORTA (não a nota) já foi atendida (Camada 3)', () => {
    it('nenhuma nota iniciada → false', () => {
        expect(resolveParadaAtendida([nota({ id: 'a' }), nota({ id: 'b' })])).toBe(false)
    })

    it('uma nota em atendimento (chegou na porta) → true', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', isInAttendance: true }),
            nota({ id: 'b' }),
        ])).toBe(true)
    })

    it('status IN_ATTENDANCE sem a flag isInAttendance também conta (mesmo fallback do resto do código)', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', status: ServiceStatus.IN_ATTENDANCE }),
        ])).toBe(true)
    })

    it('uma concluída e o resto pendente → true (terminal conta como já atendida)', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', isCompleted: true }),
            nota({ id: 'b' }),
            nota({ id: 'c' }),
        ])).toBe(true)
    })

    it('uma em insucesso (isFailed) e o resto pendente → true', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', isFailed: true }),
            nota({ id: 'b' }),
        ])).toBe(true)
    })

    it('uma cancelada (isCanceled) e o resto pendente → true', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', isCanceled: true }),
            nota({ id: 'b' }),
        ])).toBe(true)
    })

    it('lista vazia → false', () => {
        expect(resolveParadaAtendida([])).toBe(false)
    })

    it('nota apenas "a caminho" (IN_PROGRESS) NÃO conta — chegada é IN_ATTENDANCE ou além, igual ao resto do código', () => {
        expect(resolveParadaAtendida([
            nota({ id: 'a', isInProgress: true, status: ServiceStatus.IN_PROGRESS }),
        ])).toBe(false)
    })
})

describe('resolveTemEtapaPropriaAntesDoAtendimento — a porta tem nota com pré-passo próprio (Camada 3, revisão 2)', () => {
    it('todas DELIVERY → false (elegível pro bloco de chegada novo)', () => {
        expect(resolveTemEtapaPropriaAntesDoAtendimento([
            nota({ id: 'a', serviceType: ServiceType.DELIVERY }),
            nota({ id: 'b', serviceType: ServiceType.DELIVERY }),
        ])).toBe(false)
    })

    it('uma nota PICKUP → true (código de retirada é pré-passo próprio)', () => {
        expect(resolveTemEtapaPropriaAntesDoAtendimento([
            nota({ id: 'a', serviceType: ServiceType.DELIVERY }),
            nota({ id: 'b', serviceType: ServiceType.PICKUP }),
        ])).toBe(true)
    })

    it('uma nota TRANSFER → true', () => {
        expect(resolveTemEtapaPropriaAntesDoAtendimento([
            nota({ id: 'a', serviceType: ServiceType.TRANSFER }),
        ])).toBe(true)
    })

    it('uma nota SERVICE → true (conferência de equipamento é pré-passo próprio)', () => {
        expect(resolveTemEtapaPropriaAntesDoAtendimento([
            nota({ id: 'a', serviceType: ServiceType.DELIVERY }),
            nota({ id: 'b', serviceType: ServiceType.SERVICE }),
        ])).toBe(true)
    })

    it('lista vazia → false', () => {
        expect(resolveTemEtapaPropriaAntesDoAtendimento([])).toBe(false)
    })
})

describe('resolveParadaAtendidaElegivel — composição usada por ParadaContext.isParadaAtendida (Camada 3, revisão 3)', () => {
    // Regressão da revisão 3: um grupo D (DELIVERY+SERVICE, mesmo sentido em
    // `stopKeyOf`) pode se formar. Se `isParadaAtendida` olhasse só
    // `resolveParadaAtendida` (ignorando o pré-passo do SERVICE), a nota
    // DELIVERY do grupo pularia `EtapaInicial` assim que a nota SERVICE
    // entrasse em atendimento — e nunca teria seu próprio start-attendance
    // chamado, ficando PENDING no backend enquanto conferia/fotografava/
    // assinava. `resolveParadaAtendidaElegivel` é o que fecha isso: só conta
    // como "parada atendida" quando o grupo TAMBÉM é elegível (todas as notas
    // DELIVERY) — senão cada nota volta a pedir a própria chegada, que é
    // exatamente o comportamento de hoje.
    it('grupo misto DELIVERY+SERVICE, a nota SERVICE já em atendimento → false (não elegível, mesmo com uma nota atendida)', () => {
        expect(resolveParadaAtendidaElegivel([
            nota({ id: 'd1', serviceType: ServiceType.DELIVERY }),
            nota({ id: 's1', serviceType: ServiceType.SERVICE, isInAttendance: true }),
        ])).toBe(false)
    })

    it('grupo misto DELIVERY+SERVICE, nenhuma nota atendida → false', () => {
        expect(resolveParadaAtendidaElegivel([
            nota({ id: 'd1', serviceType: ServiceType.DELIVERY }),
            nota({ id: 's1', serviceType: ServiceType.SERVICE }),
        ])).toBe(false)
    })

    it('grupo todo DELIVERY, uma nota em atendimento → true (elegível e atendida)', () => {
        expect(resolveParadaAtendidaElegivel([
            nota({ id: 'd1', serviceType: ServiceType.DELIVERY, isInAttendance: true }),
            nota({ id: 'd2', serviceType: ServiceType.DELIVERY }),
        ])).toBe(true)
    })

    it('grupo todo DELIVERY, nenhuma nota atendida → false (elegível mas ainda não chegou)', () => {
        expect(resolveParadaAtendidaElegivel([
            nota({ id: 'd1', serviceType: ServiceType.DELIVERY }),
            nota({ id: 'd2', serviceType: ServiceType.DELIVERY }),
        ])).toBe(false)
    })

    it('lista vazia → false', () => {
        expect(resolveParadaAtendidaElegivel([])).toBe(false)
    })
})

describe('formatResumoDaNota — linha de apoio do card', () => {
    it('junta ordinal e janela', () => {
        expect(formatResumoDaNota(1, 2, 'Janela 08:00–12:00')).toBe('Nota 1 de 2 · Janela 08:00–12:00')
    })

    it('sem janela, fica só o ordinal', () => {
        expect(formatResumoDaNota(2, 5)).toBe('Nota 2 de 5')
    })
})
