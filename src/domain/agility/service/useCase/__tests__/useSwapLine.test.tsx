/**
 * A troca de equipamento recarrega o pedido no sucesso E na falha: um timeout depois de o servidor
 * gravar (ou um 400 de linha já trocada) deixaria a tela da parada mostrando a A como trocável.
 */
import React from 'react'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import TestRenderer, { act } from 'react-test-renderer'

import { KEY_SERVICES } from '@/domain/queryKeys'

import { useSwapLine } from '../useSwapLine'

const mockSwapLine = jest.fn()
jest.mock('../../serviceService', () => ({
    serviceService: { swapLine: (...a: unknown[]) => mockSwapLine(...a) },
}))

let queryClient: QueryClient
let hook!: ReturnType<typeof useSwapLine>

function montar() {
    let tree!: TestRenderer.ReactTestRenderer
    function Probe() {
        hook = useSwapLine()
        return null
    }
    act(() => {
        tree = TestRenderer.create(
            <QueryClientProvider client={queryClient}>
                <Probe />
            </QueryClientProvider>,
        )
    })
    return tree
}

const VARIAVEIS = { serviceId: 's1', lineId: 'a', data: { code: 'MOD-NOVO', serialNumber: 'SN-B' } }

beforeEach(() => {
    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    mockSwapLine.mockReset()
    queryClient.setQueryData([KEY_SERVICES, 's1'], {})
    queryClient.setQueryData([KEY_SERVICES, 'outro'], {})
})

describe('useSwapLine (fase 3D): recarrega o pedido no sucesso e na falha', () => {
    it('sucesso: invalida [KEY_SERVICES, serviceId] e devolve a resposta', async () => {
        const resposta = { success: true, result: { replaced: { id: 'a' }, installed: { id: 'b' } } }
        mockSwapLine.mockResolvedValue(resposta)
        const tree = montar()

        let devolvida: unknown
        await act(async () => {
            devolvida = await hook.swapLineAsync(VARIAVEIS)
        })

        expect(mockSwapLine).toHaveBeenCalledWith('s1', 'a', VARIAVEIS.data)
        expect(devolvida).toBe(resposta)
        expect(queryClient.getQueryState([KEY_SERVICES, 's1'])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_SERVICES, 'outro'])?.isInvalidated).toBe(false)

        act(() => tree.unmount())
        queryClient.clear()
    })

    it('falha (timeout ou 400): TAMBÉM invalida, e a promessa ainda rejeita para quem chama', async () => {
        const erro = { success: false, error: { message: 'A linha já foi trocada', code: 'BAD_REQUEST' } }
        mockSwapLine.mockRejectedValue(erro)
        const tree = montar()

        await act(async () => {
            await expect(hook.swapLineAsync(VARIAVEIS)).rejects.toBe(erro)
        })

        expect(queryClient.getQueryState([KEY_SERVICES, 's1'])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState([KEY_SERVICES, 'outro'])?.isInvalidated).toBe(false)

        act(() => tree.unmount())
        queryClient.clear()
    })
})
