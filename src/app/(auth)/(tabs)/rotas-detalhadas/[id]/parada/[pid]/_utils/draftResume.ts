import type { ServiceResponse } from '@/domain/agility/service/dto';

/**
 * Retomar a parada depois de recarregar o app. O rascunho devolve a `etapa`, mas
 * `delivered` e `formCompleted` só existem na memória: sem estas regras, a etapa 3
 * voltava com `delivered` falso, as telas de check (que exigem `delivered`) eram
 * puladas e o fluxo caía em "Dados" com itens pendentes.
 */

/**
 * A etapa 3 só é alcançada pelas telas de confirmação ("Entreguei", "Coletei",
 * "Concluí"), sempre junto com `setDelivered(true)`; as voltas para a etapa 2 (e a
 * troca de perna da transferência, que volta à 1) desligam `delivered`. Por isso
 * etapa ≥ 3 no rascunho quer dizer "o motorista já confirmou".
 */
export function deliveredFromDraftEtapa(etapa: number | null | undefined): boolean {
    return (etapa ?? 0) >= 3;
}

/**
 * O formulário dinâmico já foi enviado se o pedido tem resposta, dele mesmo, para
 * cada um dos seus formulários (`GET /services/:id` traz `formGroupAnswers`). O envio
 * é um POST de criação: mostrar o formulário de novo depois de recarregar duplicaria
 * as respostas.
 */
export function formAnsweredOnServer(
    service: Pick<ServiceResponse, 'id' | 'formGroupIds' | 'formGroupAnswers'> | null | undefined,
): boolean {
    const formGroupIds = service?.formGroupIds ?? [];
    if (!service || formGroupIds.length === 0) return false;
    const respondidos = new Set(
        (service.formGroupAnswers ?? []).filter((a) => a.entityId === service.id).map((a) => a.formGroupId),
    );
    return formGroupIds.every((id) => respondidos.has(id));
}

/**
 * Qual etapa restaurar do rascunho. A etapa 2 em diante ("Entreguei / Não entreguei" e
 * as seguintes) só existe com o pedido EM ATENDIMENTO, isto é, depois do
 * `start-attendance`. Pedido fora de atendimento com rascunho adiantado é resíduo de
 * uma tentativa anterior (o pedido voltou à fila): retomar a etapa dela pula "Indo pra
 * lá / Estou aqui!", o `start-attendance` nunca roda e o "Finalizar" volta 400.
 *
 * Voltar à etapa 1 não atrapalha o check de saída do SERVICE: ele aparece antes da
 * chegada pelo estado do pedido (`!isServiceStarted && needsMaterialCheck`), não pela
 * etapa. TRANSFER conduz a navegação por perna manualmente e fica de fora.
 */
export function etapaRestauradaDoRascunho(params: {
    etapa: number | null | undefined;
    emAtendimento: boolean;
    isTransfer: boolean;
}): number {
    const etapa = params.etapa ?? 0;
    if (etapa < 1) return 1;
    if (params.isTransfer || params.emAtendimento) return etapa;
    return 1;
}

/**
 * A hidratação do rascunho decide a etapa pelo status do pedido, então só roda com o
 * serviço carregado e sem refetch em voo: com cache velho (ASSIGNED em cache, servidor
 * já IN_ATTENDANCE) a etapa seria limitada a 1 por um status defasado.
 */
export function serviceProntoParaHidratar(params: {
    service: unknown | null | undefined;
    isRefetching: boolean;
}): boolean {
    return !!params.service && !params.isRefetching;
}
