import { FlatList, RefreshControl } from 'react-native';

import { ActivityIndicator, Box, ScreenBase, Text } from '@/components';

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

export default function RoutesScreen() {
  const {
    driverId,
    isAvailable,
    isLoading,
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

  if (isLoading || !driverId) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt="y16">Carregando...</Text>
      </Box>
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

        <RoutesHeader />

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
