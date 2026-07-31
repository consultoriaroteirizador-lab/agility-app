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
            // `dismissTo`, não `push` nem `replace`: o índice já está NA PILHA —
            // o motorista o empilhou ao abrir esta nota (`handleOpenNota`, em
            // `parada/[pid]/index.tsx`) — mas a profundidade até lá VARIA por
            // tela. `entrega`/`coleta`/`service` são empilhadas direto sobre o
            // índice (1 nível: [..., índice, nota]), mas `insucesso` pode estar
            // 3 níveis abaixo, porque o caminho até ela passa por
            // `nao-realizado` (`entrega/_components/.../EtapaConfirmacao.tsx` →
            // push `nao-realizado` → push `insucesso`): [..., índice, nota,
            // nao-realizado, insucesso]. `replace` só troca o frame ATUAL pelo
            // índice — o índice original de baixo continua na pilha, então cada
            // nota fechada empilharia mais um índice por cima (4 notas = 4
            // índices sobrepostos até a rota, o mesmo amontoado que esta task
            // existe pra evitar). `push` teria o mesmo problema, pior.
            // `dismissTo` resolve os dois formatos de uma vez: ele DESEMPILHA
            // (`POP_TO`, via React Navigation) até encontrar uma tela já
            // existente com esse pathname na pilha — não importa se está 1 ou 3
            // níveis abaixo — e só atualiza os params dela; nada novo é
            // empilhado. Se por algum motivo o índice não estiver na pilha
            // (ex.: deep link direto pra uma nota, sem passar pelo índice
            // antes), a própria API cai para `replace` como fallback — degrada
            // para o comportamento antigo em vez de quebrar.
            router.dismissTo({
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
