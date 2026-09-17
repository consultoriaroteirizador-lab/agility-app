import { useState } from 'react';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useFindServiceAttempts } from '@/domain/agility/service/useCase';
import { measure } from '@/theme';

import { outcomeTentativaLabel, tentativaTitulo } from '../../_utils/attemptLabels';

interface Props {
  serviceId: string;
  /** `service.attemptCount`. Zero = primeira visita, o componente não renderiza. */
  attemptCount: number;
}

/** Data curta (dd/mm hh:mm) a partir do ISO do backend. */
function formatarQuando(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const dia = String(d.getDate()).padStart(2, '0');
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const hora = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${dia}/${mes} ${hora}:${min}`;
}

/**
 * Selo "2a tentativa de 3" + o que houve nas tentativas anteriores.
 *
 * NÃO mostra quem tentou: a resposta do backend traz `driverName`/`failedBy`,
 * e o app deliberadamente não os renderiza — o motorista precisa saber o que
 * aconteceu na porta, não quem esteve lá.
 *
 * A lista só é buscada quando o motorista abre o bloco — parada em primeira
 * visita (`attemptCount` zero) não renderiza nada nem gasta chamada.
 */
export function TentativasAnteriores({ serviceId, attemptCount }: Props) {
  const [aberto, setAberto] = useState(false);
  const { attempts, isLoading } = useFindServiceAttempts(serviceId, attemptCount > 0);

  if (attemptCount <= 0) return null;

  const limite = attempts[0]?.maxAttempts;

  return (
    <Box gap="y8" width="100%">
      <TouchableOpacityBox
        flexDirection="row"
        alignItems="center"
        gap="x8"
        backgroundColor="yellow40"
        p="y12"
        borderRadius="s12"
        onPress={() => setAberto((v) => !v)}
      >
        <Icon name="history" size={measure.m20} color="gray800" />
        <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary" flex={1}>
          {tentativaTitulo(attemptCount + 1, limite)}
        </Text>
        <Icon name={aberto ? 'expand-less' : 'expand-more'} size={measure.m20} color="gray600" />
      </TouchableOpacityBox>

      {aberto ? (
        isLoading ? (
          <Box py="y12" alignItems="center">
            <ActivityIndicator />
          </Box>
        ) : attempts.length === 0 ? (
          <Box backgroundColor="gray50" p="y12" borderRadius="s12">
            <Text preset="text12" color="gray600">
              Sem detalhes das tentativas anteriores.
            </Text>
          </Box>
        ) : (
          attempts.map((a) => (
            <Box key={a.id} backgroundColor="gray50" p="y12" borderRadius="s12" gap="y2">
              <Text preset="text12" color="gray600">
                {tentativaTitulo(a.attemptNumber, a.maxAttempts)} · {formatarQuando(a.failedAt)}
              </Text>
              <Text preset="text14" fontWeightPreset="semibold" color="colorTextPrimary">
                {a.reasonName ?? 'Sem motivo registrado'}
              </Text>
              {a.notes ? (
                <Text preset="text12" color="gray600">
                  {a.notes}
                </Text>
              ) : null}
              <Text preset="text12" color="gray500">
                {outcomeTentativaLabel(a.outcome)}
                {a.returnedFacilityName ? ` · ${a.returnedFacilityName}` : ''}
              </Text>
            </Box>
          ))
        )
      ) : null}
    </Box>
  );
}
