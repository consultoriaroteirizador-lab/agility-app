import { FlatList, RefreshControl } from 'react-native';

import { ActivityIndicator, Box, Button, ScreenBase, Text } from '@/components';
import { useAuthCredentialsService } from '@/services';

import { AvailabilityToggle, RoutesHeader, RouteItem, RoutesModals } from './_rotas/components';
import { useRoutesScreen } from './_rotas/hooks';

function EmptyList() {
  return (
    <Box py="y32" alignItems="center">
      <Text preset="text14" color="gray400" textAlign="center">
        Nenhuma rota disponível ainda. Aceite uma oferta para começar.
      </Text>
    </Box>
  );
}

/** Estado centralizado com mensagem + ação — evita spinner infinito em falhas. */
function CenteredState({
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <Box flex={1} justifyContent="center" alignItems="center" px="x24">
      <Text preset="text16" textAlign="center">
        {title}
      </Text>
      {subtitle ? (
        <Text preset="text14" color="gray400" textAlign="center" mt="y8">
          {subtitle}
        </Text>
      ) : null}
      {onAction && actionLabel ? (
        <Button title={actionLabel} onPress={onAction} marginTop="y24" />
      ) : null}
    </Box>
  );
}

export default function RoutesScreen() {
  const {
    driverId,
    isAvailable,
    isLoading,
    isError,
    routes,
    isUpdatingAvailability,
    isStartingRoute,
    refreshing,
    startRoutePopup,
    routeAlreadyStartedPopup,
    unavailablePopup,
    handleToggleAvailability,
    openStartRoutePopup,
    closeStartRoutePopup,
    closeRouteAlreadyStartedPopup,
    closeUnavailablePopup,
    confirmStartRoute,
    onRefresh,
  } = useRoutesScreen();

  const { removeCredentials } = useAuthCredentialsService();

  // Conta autenticada mas SEM driver_id no token = cadastro de motorista
  // incompleto (ex.: e-mail não verificado / vínculo não provisionado).
  // Antes isso prendia a tela em "Carregando..." para sempre.
  if (!driverId) {
    return (
      <CenteredState
        title="Conta não configurada"
        subtitle="Seu cadastro de motorista ainda não está completo (por exemplo, e-mail não verificado). Fale com o suporte ou entre com outra conta."
        actionLabel="Sair"
        onAction={() => removeCredentials()}
      />
    );
  }

  if (isLoading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando...</Text>
      </Box>
    );
  }

  // Falha ao carregar as rotas: mostra erro com retry em vez de spinner eterno.
  if (isError) {
    return (
      <CenteredState
        title="Não foi possível carregar suas rotas"
        subtitle="Verifique sua conexão e tente novamente."
        actionLabel="Tentar novamente"
        onAction={onRefresh}
      />
    );
  }

  return (
    <ScreenBase >
      <Box flex={1} pt="y12">
        <AvailabilityToggle
          isAvailable={isAvailable}
          isLoading={isUpdatingAvailability}
          disabled={!driverId}
          onToggle={handleToggleAvailability}
        />

        <RoutesHeader onRefresh={onRefresh} isRefreshing={refreshing} />

        <FlatList
          data={routes}
          renderItem={({ item }) => (
            <RouteItem route={item} onPress={openStartRoutePopup} />
          )}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={EmptyList}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />

        <RoutesModals
          startRoutePopup={startRoutePopup}
          routeAlreadyStartedPopup={routeAlreadyStartedPopup}
          unavailablePopup={unavailablePopup}
          isStartingRoute={isStartingRoute}
          onConfirmStartRoute={confirmStartRoute}
          onCloseStartRoutePopup={closeStartRoutePopup}
          onCloseRouteAlreadyStartedPopup={closeRouteAlreadyStartedPopup}
          onCloseUnavailablePopup={closeUnavailablePopup}
        />
      </Box>
    </ScreenBase>
  );
}
