import { memo } from 'react';
import { Image } from 'react-native';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { measure } from '@/theme';

interface RoutesHeaderProps {
    title?: string;
    subtitle?: string;
    /** Quando presente, mostra o botão de atualizar ao lado do título. */
    onRefresh?: () => void;
    isRefreshing?: boolean;
}

/**
 * Botão redondo de atualizar.
 *
 * O pull-to-refresh continua funcionando, mas é um gesto invisível: motorista
 * que não o conhece ficava preso na lista velha. Enquanto a busca está em voo o
 * botão vira spinner e recusa toque, senão cada toque empilha uma requisição.
 */
function RefreshButton({ onPress, isRefreshing }: { onPress: () => void; isRefreshing: boolean }) {
    return (
        <TouchableOpacityBox
            testID="routes-header-refresh"
            accessibilityRole="button"
            accessibilityLabel="Atualizar lista de rotas"
            accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
            onPress={onPress}
            disabled={isRefreshing}
            activeOpacity={0.7}
            width={measure.x40}
            height={measure.y40}
            borderRadius="s20"
            borderWidth={measure.m1}
            borderColor="gray200"
            backgroundColor="white"
            alignItems="center"
            justifyContent="center"
            mr="x12"
        >
            {isRefreshing ? (
                <ActivityIndicator size="small" />
            ) : (
                <Icon name="refresh" size={measure.m22} color="primary100" />
            )}
        </TouchableOpacityBox>
    );
}

function RoutesHeaderComponent({
    title = 'Lista de rotas',
    subtitle = 'Gerencie todas suas rotas',
    onRefresh,
    isRefreshing = false,
}: RoutesHeaderProps) {
    return (
        <>
            <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="y12">
                <Box flex={1} pr="x12">
                    <Text preset="text20" fontWeightPreset='semibold' color="colorTextPrimary">
                        {title}
                    </Text>
                    <Text preset="text14" color="gray400" mt="y4">
                        {subtitle}
                    </Text>
                </Box>

                {onRefresh ? (
                    <RefreshButton onPress={onRefresh} isRefreshing={isRefreshing} />
                ) : null}

                <Image
                    source={require('@/assets/images/agility/rotas/imgRotasHeader.png')}
                    width={measure.x56}
                    height={measure.y56}
                    resizeMode="contain"
                />
            </Box>

            <Box height={measure.y1} backgroundColor="gray200" width="100%" mb="y16" />
        </>
    );
}

export const RoutesHeader = memo(RoutesHeaderComponent);
