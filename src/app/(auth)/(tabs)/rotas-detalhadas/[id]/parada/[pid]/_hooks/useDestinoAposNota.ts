import { useCallback, useRef } from 'react';

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

    // A função devolvida tem IDENTIDADE ESTÁVEL (deps `[router]`, que o
    // expo-router mantém estável) e lê os dados frescos deste ref na hora em que
    // é CHAMADA. Não é preciosismo — é correção de um bug real:
    //
    // As quatro telas de fechamento armam o redirect num `useEffect` que tem
    // esta função nas dependências. A tela de uma nota JÁ CONCLUÍDA continua
    // montada (o destino final é `push`, que empilha por cima em vez de
    // substituir). Enquanto a identidade mudava a cada refetch da lista da rota
    // — `pedidosDaParada` é um array novo a cada resposta —, aquela tela zumbi
    // re-armava o timer e navegava DE NOVO, arrastando o motorista para fora da
    // tela em que ele estava. Provado por log em 31/07/2026: `destinoAposNota`
    // chamado com o id da nota anterior enquanto o motorista estava em OUTRA
    // parada, três vezes seguidas.
    //
    // O efeito original (antes da Task 5) dependia só de valores estáveis e por
    // isso disparava UMA vez. O ref devolve essa propriedade sem abrir mão de
    // decidir com o dado mais recente.
    const dadosRef = useRef({ pedidosDaParada, notaAtualId, rotaId, router });
    dadosRef.current = { pedidosDaParada, notaAtualId, rotaId, router };

    return useCallback(() => {
        const { pedidosDaParada: pedidos, notaAtualId: notaId, rotaId: rota, router: nav } = dadosRef.current;

        if (temOutraNotaPorTrabalhar(pedidos, notaId)) {
            // Representante do grupo (`pedidos[0]`) — mesma convenção que a lista
            // da rota usa para abrir uma parada (`mapGrupoToParada` numera pelo
            // grupo; `useParadaNavigation.navigateToStop` navega com
            // `parada.serviceId = grupo[0].id`). O índice resolve o grupo a
            // partir de QUALQUER id membro, mas usar sempre o representante
            // mantém as duas rotas de entrada (lista → índice, nota → índice)
            // consistentes.
            const representanteId = pedidos[0]?.id ?? notaId;
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
            nav.dismissTo({
                pathname: '/rotas-detalhadas/[id]/parada/[pid]',
                params: { id: rota, pid: representanteId },
            });
            return;
        }

        // Última nota da porta: comportamento de hoje, intocado. Aqui o `push`
        // original já fazia sentido (sai do fluxo da parada para a lista da
        // rota, uma tela "de cima" na hierarquia) — mantido como estava.
        nav.push(`/(auth)/(tabs)/rotas-detalhadas/${rota}`);
    // Sem dependências de propósito: TUDO vem do ref, então a identidade nunca
    // muda e o efeito que arma o redirect não re-arma. Ver o bloco acima.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
}
