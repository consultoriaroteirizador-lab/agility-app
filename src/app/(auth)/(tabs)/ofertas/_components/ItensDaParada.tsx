import { Box, Text } from '@/components';
import { TouchableOpacityBox } from '@/components/RestyleComponent/RestyleComponent';
import { measure } from '@/theme';

import type { ItemOferta } from '../_utils/cargaOferta';

/** Quantos itens a parada mostra direto no card; o resto abre a lista completa. */
const ITENS_VISIVEIS = 3;

// Itens de uma parada, dentro do card da timeline. Some quando a lista está vazia:
// rota de serviço em campo costuma não ter material, e um "Itens" vazio só ocupa espaço.
type ItensDaParadaProps = {
  titulo: string;
  itens: ItemOferta[];
  onVerTodos: () => void;
  /** Onde o item vai no veículo (fase 5C); `null` ou ausente: nada aparece. */
  compartimentoDe?: (lineId: string) => string | null;
};

export function ItensDaParada({ titulo, itens, onVerTodos, compartimentoDe }: ItensDaParadaProps) {
  if (itens.length === 0) return null;

  const visiveis = itens.slice(0, ITENS_VISIVEIS);
  const restantes = itens.length - visiveis.length;

  return (
    <Box mt="y12" pt="y12" borderTopWidth={measure.m1} borderColor="gray200" gap="y6">
      <Text preset="text12" color="gray600">{titulo}</Text>
      {visiveis.map((item) => {
        const compartimento = compartimentoDe?.(item.id) ?? null;
        return (
          <Box key={item.id}>
            <Box flexDirection="row" alignItems="flex-start" gap="x8">
              {item.quantidade !== null && (
                <Text preset="text13" fontWeightPreset="semibold" color="primary100">
                  {item.quantidade}{item.unidade ? ` ${item.unidade}` : 'x'}
                </Text>
              )}
              <Text preset="text13" color="colorTextPrimary" flexShrink={1}>
                {item.nome}
              </Text>
            </Box>
            {!!compartimento && <Text preset="text12" color="gray500">{compartimento}</Text>}
          </Box>
        );
      })}
      {restantes > 0 && (
        <TouchableOpacityBox onPress={onVerTodos} alignSelf="flex-start" py="y4">
          <Text preset="text13" fontWeightPreset="semibold" color="primary100">
            + {restantes} {restantes > 1 ? 'itens' : 'item'} · ver todos
          </Text>
        </TouchableOpacityBox>
      )}
    </Box>
  );
}
