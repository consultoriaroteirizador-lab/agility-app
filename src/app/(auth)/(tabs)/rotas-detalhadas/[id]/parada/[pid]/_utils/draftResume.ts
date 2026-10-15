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
