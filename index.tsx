import { FlatList } from 'react-native';

import { AvailabilityToggle, RouteItem, RoutesHeader, RoutesModals } from '@/app/(auth)/(tabs)/rotas/components';
import { useRoutesScreen } from '@/app/(auth)/(tabs)/rotas/hooks';
import { ActivityIndicator, Box, ScreenBase, Text } from '@/components';



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
    startRoutePopup,
    routeAlreadyStartedPopup,
    unavailablePopup,
    handleToggleAvailability,
    openStartRoutePopup,
    closeStartRoutePopup,
    closeRouteAlreadyStartedPopup,
    closeUnavailablePopup,
    confirmStartRoute,
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
    <ScreenBase>
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
