import { ActivityIndicator, Box, PessoaContatoRow, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { RoutingStatus } from '@/domain/agility/routing/dto/types';
import { useFindMyRoutings, useFindOneRouting } from '@/domain/agility/routing/useCase';
import { useMyTeamRoster } from '@/domain/agility/team/useCase';

export default function MinhaEquipeScreen() {
  const { colegas, temEquipe, isLoading, isError, refetch } = useMyTeamRoster();

  // Tripulação de hoje: os ajudantes da rota EM ANDAMENTO. Só o
  // `GET /routings/:id` embute `helpers`, por isso a segunda chamada — a
  // listagem devolve payload leve, sem tripulação.
  const { routings } = useFindMyRoutings({ status: RoutingStatus.IN_PROGRESS });
  const rotaEmAndamento = routings[0] ?? null;
  const { routing } = useFindOneRouting(rotaEmAndamento?.id);
  const ajudantesDeHoje = routing?.helpers ?? [];

  return (
    <ScreenBase
      buttonLeft={<ButtonBack />}
      title={
        <Text preset="text20" fontWeightPreset="bold" color="colorTextPrimary">
          Minha equipe
        </Text>
      }
    >
      <Box flex={1} scrollable backgroundColor="white" pt="y12" pb="y24">
        {isLoading && (
          <Box flex={1} alignItems="center" justifyContent="center" py="y32">
            <ActivityIndicator />
            <Text preset="text14" color="gray500" mt="y16">
              Carregando...
            </Text>
          </Box>
        )}

        {isError && !isLoading && (
          <Box flex={1} alignItems="center" justifyContent="center" px="x16" py="y32">
            <Text preset="text14" color="colorTextError" textAlign="center" mb="y16">
              Não foi possível carregar sua equipe.
            </Text>
            <TouchableOpacityBox
              backgroundColor="primary100"
              px="x24"
              py="y12"
              borderRadius="s8"
              onPress={() => refetch()}
            >
              <Text preset="text14" fontWeightPreset="bold" color="white">
                Tentar novamente
              </Text>
            </TouchableOpacityBox>
          </Box>
        )}

        {!isLoading && !isError && (
          <Box mb="y32">
            <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary" mb="y8">
              Minha equipe fixa
            </Text>

            {/* Estado vazio honesto: o motorista não cria equipe, então não há
                ação a oferecer aqui — só a informação. */}
            {!temEquipe && (
              <Text preset="text15" color="gray400">
                Você ainda não faz parte de uma equipe.
              </Text>
            )}

            {temEquipe && colegas.length === 0 && (
              <Text preset="text15" color="gray400">
                Você é o único membro da sua equipe.
              </Text>
            )}

            {colegas.map((colega) => (
              <PessoaContatoRow
                key={colega.id}
                nome={colega.personName ?? 'Membro sem nome'}
                telefone={colega.personPhone}
                etiqueta={colega.role === 'LEADER' ? 'Líder' : undefined}
              />
            ))}
          </Box>
        )}

        {ajudantesDeHoje.length > 0 && (
          <Box mb="y32">
            <Text preset="text15" fontWeightPreset="bold" color="colorTextPrimary" mb="y8">
              Comigo hoje
            </Text>
            <Text preset="text12" color="gray400" mb="y8">
              Escalados na rota em andamento
            </Text>

            {ajudantesDeHoje.map((ajudante) => (
              <PessoaContatoRow
                key={ajudante.id}
                nome={ajudante.helperName ?? 'Ajudante sem nome'}
                telefone={ajudante.helperPhone ?? null}
              />
            ))}
          </Box>
        )}
      </Box>
    </ScreenBase>
  );
}
