/**
 * OfferAlertModal — alerta in-app de NOVA OFERTA (estilo app de motorista).
 *
 * Quando uma oferta chega pelo socket `/monitoring` (evento `offer.available`)
 * com o app aberto, sobe um bottom-sheet destacado com o resumo da oferta
 * (valor, paradas, distância, tempo) e ação "Ver oferta". É montado globalmente
 * pelo LocationTrackingProvider (dono do socket), então aparece em qualquer tela.
 */
import { Modal } from 'react-native';

import { Box, Button, Text } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { useAppSafeArea } from '@/hooks';
import { measure } from '@/theme';

export interface IncomingOffer {
  id?: string;
  code?: string;
  totalValue?: number | null;
  totalDistanceKm?: number | null;
  totalDurationMinutes?: number | null;
  totalServices?: number | null;
}

export interface OfferAlertModalProps {
  offer: IncomingOffer | null;
  onView: () => void;
  onDismiss: () => void;
}

function formatarPreco(valor: number | null | undefined): string {
  if (!valor) return 'R$ 0,00';
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function formatarDistancia(km: number | null | undefined): string {
  if (!km) return '0 km';
  return `${km.toFixed(1).replace('.', ',')} km`;
}

function formatarTempo(min: number | null | undefined): string {
  if (!min) return '0min';
  if (min < 60) return `${Math.round(min)}min`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function OfferAlertModal({ offer, onView, onDismiss }: OfferAlertModalProps) {
  const safeArea = useAppSafeArea();
  const visible = !!offer;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
      <Box flex={1} justifyContent="flex-end" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <Box
          backgroundColor="white"
          px="x24"
          pt="y24"
          style={{ borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: safeArea.bottom + 16 }}
        >
          {/* Cabeçalho */}
          <Box alignItems="center" mb="y16">
            <Box
              width={measure.x48}
              height={measure.y48}
              borderRadius="s24"
              backgroundColor="primary10"
              justifyContent="center"
              alignItems="center"
            >
              <Icon name="local-shipping" size={24} color="primary100" />
            </Box>
            <Text preset="text18" fontWeight="700" color="colorTextPrimary" mt="y12">
              Nova oferta de rota!
            </Text>
          </Box>

          {/* Valor + resumo */}
          <Box alignItems="center" mb="y24">
            <Text preset="text24" color="primary100" fontWeight="700">
              {formatarPreco(offer?.totalValue)}
            </Text>
            <Box flexDirection="row" alignItems="center" gap="x12" mt="y8" flexWrap="wrap" justifyContent="center">
              <Text preset="text14" color="gray500">
                {offer?.totalServices ?? 0} paradas
              </Text>
              <Text preset="text14" color="gray300">·</Text>
              <Text preset="text14" color="gray500">
                {formatarDistancia(offer?.totalDistanceKm)}
              </Text>
              <Text preset="text14" color="gray300">·</Text>
              <Text preset="text14" color="gray500">
                {formatarTempo(offer?.totalDurationMinutes)}
              </Text>
            </Box>
          </Box>

          {/* Ações */}
          <Button title="Ver oferta" onPress={onView} />
          <Button title="Agora não" preset="outline" onPress={onDismiss} mt="y12" />
        </Box>
      </Box>
    </Modal>
  );
}
