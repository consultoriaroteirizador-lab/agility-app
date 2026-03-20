import React from 'react';

import { MaterialIcons } from '@expo/vector-icons';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTheme } from '@shopify/restyle';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { useGetUnreadCount } from '@/domain/agility/notification/useCase';
import { measure } from '@/theme';
import { Theme } from '@/theme/theme';

export function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme<Theme>();
  const { unreadCount } = useGetUnreadCount();

  // Filtrar rotas antes do map para manter consistência no índice
  const hiddenRoutes = ['rotas-detalhadas'];
  const visibleRoutes = state.routes.filter(
    (route) => !hiddenRoutes.includes(route.name)
  );

  return (
    <Box
      backgroundColor='white'
      borderTopWidth={measure.m1}
      borderTopColor='mutedElementsColor'
      paddingTop="t4"
      flexDirection="row"
    >
      {visibleRoutes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;

        // Corrigir: usar índice das rotas visíveis
        const isFocused = state.routes[state.index]?.name === route.name;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        // Determinar o ícone baseado no nome da rota
        const getIconName = () => {
          switch (route.name) {
            case 'index':
              return 'location-on';
            case 'ofertas':
              return 'local-offer';
            case 'notificacoes':
              return 'notifications';
            case 'menu':
              return 'menu';
            default:
              return 'circle';
          }
        };

        // Usar cores reais do tema
        const iconColor = isFocused
          ? theme.colors.primary100
          : theme.colors.mutedElementsColor;
        const iconSize = 24;

        // Verificar se deve mostrar badge
        const showBadge = route.name === 'notificacoes' && unreadCount > 0;

        return (
          <TouchableOpacityBox
            key={route.key}
            flex={1}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            onPress={onPress}
            onLongPress={onLongPress}
            height={measure.y60}
            justifyContent='center'
          >
            <Box alignItems="center" justifyContent="center">
              <Box position="relative">
                <MaterialIcons name={getIconName()} size={iconSize} color={iconColor} />
                {showBadge && (
                  <Box
                    position="absolute"
                    top={-4}
                    right={-8}
                    bg="secondary100"
                    borderRadius="s12"
                    minWidth={measure.m16}
                    height={measure.m16}
                    alignItems="center"
                    justifyContent="center"
                    px="x4"
                  >
                    <Text
                      preset="textFinePrint"
                      color="white"
                      fontWeight="bold"
                    >
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </Box>
                )}
              </Box>
              <Text
                preset="text12"
                color={isFocused ? 'primary100' : 'mutedElementsColor'}
              >
                {typeof label === 'string' ? label : route.name}
              </Text>
            </Box>
          </TouchableOpacityBox>
        );
      })}
    </Box>
  );
}
