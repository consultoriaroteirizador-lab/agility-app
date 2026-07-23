import { Stack } from 'expo-router';

import { LocationTrackingProvider } from '@/components/LocationTrackingProvider';
import { ChatProvider } from '@/domain/agility/chat/context';
import { OfferAlertProvider } from '@/services/offer/OfferAlertProvider';

export default function LayoutStack() {
  return (
    // OfferAlertProvider fica ACIMA do LocationTrackingProvider: o popup global
    // de oferta precisa envolver quem dispara `pushOffer` (o WS de telemetria
    // vive dentro do LocationTrackingProvider) para poder aparecer sobre
    // qualquer tela da sessão autenticada.
    // LocationTrackingProvider vive por toda a sessão autenticada (não mais preso
    // à tela de detalhe da rota). O start/stop do SDK é dirigido pela rota
    // IN_PROGRESS lá dentro, independente do toggle de disponibilidade.
    <OfferAlertProvider>
      <LocationTrackingProvider>
        <ChatProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

            <Stack.Screen name="ChanceTemporaryPasswordScreen/index" />
            <Stack.Screen name="RegisterAllowsBiometricScreen/index" />
          </Stack>
        </ChatProvider>
      </LocationTrackingProvider>
    </OfferAlertProvider>
  );
}

