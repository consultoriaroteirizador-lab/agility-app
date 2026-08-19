/**
 * "Esta rota é de serviço em campo?" — a pergunta que decide o badge da home.
 *
 * O eixo é `routingProfile`, o campo VIVO: o fluxo de roteirização obriga a
 * escolher o perfil e o envia em todos os caminhos de criação. `routingType` é
 * o campo aposentado (o ERP não envia, o backend não lê) e entra só como
 * fallback de legado, para rota antiga que ficou sem perfil.
 *
 * Antes o app lia SÓ o `routingType`, e o `default` do badge devolvia
 * "Entrega". Como `routing_type` é nulo em 86% das rotas — incluindo 48
 * `FIELD_SERVICE` na medição de 19/08/2026 —, TODA rota de serviço em campo
 * aparecia como Entrega para o motorista.
 *
 * Mesma regra do `tipoFilter.ts` (dashboard) e do `routing-category.ts`
 * (backend). São três cópias vivas: mudar uma exige mudar as outras, e os
 * casos deste teste são os mesmos dos outros dois de propósito.
 */
export function isFieldServiceRoute(
  route?: { routingProfile?: string | null; routingType?: string | null } | null,
): boolean {
  const profile = String(route?.routingProfile ?? '').toUpperCase();
  const type = String(route?.routingType ?? '').toUpperCase();

  if (profile) return profile === 'FIELD_SERVICE';
  return type === 'SERVICE';
}
