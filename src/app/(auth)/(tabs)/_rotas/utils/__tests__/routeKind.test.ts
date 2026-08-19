import { isFieldServiceRoute } from '../routeKind';

/**
 * Casos espelhados de `tipoFilter.test.ts` (dashboard) e do spec do repositório
 * no backend. A regra é a MESMA nos três lugares; se um lado mudar sem os
 * outros, o app passa a discordar do painel sobre a mesma rota.
 */
describe('isFieldServiceRoute', () => {
  it('perfil FIELD_SERVICE é serviço', () => {
    expect(isFieldServiceRoute({ routingProfile: 'FIELD_SERVICE', routingType: null })).toBe(true);
  });

  it('perfil de entrega não é serviço', () => {
    expect(isFieldServiceRoute({ routingProfile: 'LAST_MILE', routingType: null })).toBe(false);
    expect(isFieldServiceRoute({ routingProfile: 'PICKUP_DELIVERY', routingType: null })).toBe(false);
  });

  // O caso que motivou a mudança: 48 rotas FIELD_SERVICE no dev têm
  // routing_type NULL, e o app lia SÓ o routing_type — então TODA rota de
  // serviço em campo aparecia como "Entrega" na home do motorista.
  it('perfil FIELD_SERVICE vence o tipo ausente', () => {
    expect(isFieldServiceRoute({ routingProfile: 'FIELD_SERVICE', routingType: null })).toBe(true);
  });

  // Legado: rota antiga sem perfil, mas com o tipo velho preenchido.
  it('sem perfil, cai no routingType SERVICE', () => {
    expect(isFieldServiceRoute({ routingProfile: null, routingType: 'SERVICE' })).toBe(true);
  });

  it('sem perfil e sem tipo é entrega (regra binária do produto)', () => {
    expect(isFieldServiceRoute({ routingProfile: null, routingType: null })).toBe(false);
  });

  // O tipo velho NÃO sobrepõe o perfil: o perfil é o campo vivo, o tipo é o
  // aposentado. Uma rota de entrega marcada SERVICE no legado segue entrega.
  it('perfil vivo tem precedência sobre o tipo aposentado', () => {
    expect(isFieldServiceRoute({ routingProfile: 'LAST_MILE', routingType: 'SERVICE' })).toBe(false);
  });

  it('não quebra com rota indefinida ou campos ausentes', () => {
    expect(isFieldServiceRoute(undefined)).toBe(false);
    expect(isFieldServiceRoute({})).toBe(false);
  });
});
