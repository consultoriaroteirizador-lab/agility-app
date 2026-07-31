import { useCallback } from 'react';

import { useRouter } from 'expo-router';

import type { ServiceResponse } from '@/domain/agility/service/dto';

import { temOutraNotaPorTrabalhar } from '../../../_utils/paradaDisplay';

/**
 * UM ponto de decisão para "para onde vai o motorista depois de fechar uma
 * nota" (entrega, coleta, serviço ou insucesso) — Task 5.
 *
 * As quatro telas de fechamento de nota (`entrega/index.tsx`,
 * `coleta/index.tsx`, `service/index.tsx`, `insucesso/index.tsx`)
 * repetiam o MESMO `router.push` cego para a lista de paradas da rota,
 * ignorando que a parada pode ser uma PORTA com N notas (Camada 2/3): ao
 * fechar 1 de 4 notas, o motorista caía na lista da rota e tinha que achar
 * a parada de novo e reabrir para pegar a próxima. Quatro cópias da mesma
 * decisão é exatamente como esta feature já regrediu duas vezes (chave do
 * app vs chave do backend; índice vs fluxo) — daqui em diante é uma função
 * (`temOutraNotaPorTrabalhar`, em `_utils/paradaDisplay.ts`) e um hook.
 *
 * Recebe os pedidos da parada e o id da nota corrente EXPLICITAMENTE (em vez
 * de ler `ParadaContext` por dentro) porque nem toda tela de fechamento tem
 * o Provider: `insucesso/index.tsx` é uma tela isolada (ver comentário em
 * `useInsucessoDraft.ts`), sem `ParadaProvider`. As telas que TÊM o contexto
 * (entrega/coleta/service) passam `pedidosDaParada` exposto por
 * `ParadaContext` — a mesma lista que já alimenta `isParadaAtendida`, sem
 * re-derivar; `insucesso` monta a mesma lista com o mesmo
 * `resolvePedidosDaParada` que o contexto usa por baixo.
 */
export function useDestinoAposNota(
    pedidosDaParada: ServiceResponse[],
    notaAtualId: string,
    rotaId: string,
) {
    const router = useRouter();

    return useCallback(() => {
        if (temOutraNotaPorTrabalhar(pedidosDaParada, notaAtualId)) {
            // Representante do grupo (`pedidos[0]`) — mesma convenção que a lista
            // da rota usa para abrir uma parada (`mapGrupoToParada` numera pelo
            // grupo; `useParadaNavigation.navigateToStop` navega com
            // `parada.serviceId = grupo[0].id`). O índice resolve o grupo a
            // partir de QUALQUER id membro, mas usar sempre o representante
            // mantém as duas rotas de entrada (lista → índice, nota → índice)
            // consistentes.
            const representanteId = pedidosDaParada[0]?.id ?? notaAtualId;
            // `replace`, não `push`: o motorista JÁ VEIO do índice — ele o
            // empilhou ao abrir esta nota (`handleOpenNota`, em
            // `parada/[pid]/index.tsx`). Empilhar outro índice por cima faria a
            // pilha crescer 1 nível por nota fechada (4 notas = 4 índices
            // empilhados até a rota), tornando o botão "voltar" do device uma
            // viagem por telas de notas já concluídas. `replace` troca a tela da
            // nota (agora terminal, sem mais função) pelo índice atualizado, sem
            // aumentar a profundidade da pilha.
            router.replace({
                pathname: '/rotas-detalhadas/[id]/parada/[pid]',
                params: { id: rotaId, pid: representanteId },
            });
            return;
        }

        // Última nota da porta: comportamento de hoje, intocado. Aqui o `push`
        // original já fazia sentido (sai do fluxo da parada para a lista da
        // rota, uma tela "de cima" na hierarquia) — mantido como estava.
        router.push(`/(auth)/(tabs)/rotas-detalhadas/${rotaId}`);
    }, [pedidosDaParada, notaAtualId, rotaId, router]);
}
