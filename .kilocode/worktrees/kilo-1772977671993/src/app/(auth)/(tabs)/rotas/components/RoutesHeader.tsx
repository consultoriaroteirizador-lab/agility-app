import { memo } from 'react';
import { Image } from 'react-native';

import { Box, Text } from '@/components';
import { measure } from '@/theme';

interface RoutesHeaderProps {
    title?: string;
    subtitle?: string;
}

function RoutesHeaderComponent({
    title = 'Lista de rotas',
    subtitle = 'Gerencie todas suas rotas',
}: RoutesHeaderProps) {
    return (
        <>
            <Box flexDirection="row" justifyContent="space-between" alignItems="flex-start" mb="y12">
                <Box>
                    <Text preset="text20" fontWeightPreset='semibold' color="colorTextPrimary">
                        {title}
                    </Text>
                    <Text preset="text16" color="gray400" mt="y4">
                        {subtitle}
                    </Text>
                </Box>
                <Image
                    source={require('@/assets/images/agility/rotas/imgRotasHeader.png')}
                    width={measure.x80}
                    height={measure.y80}
                    resizeMode="contain"
                />
            </Box>

            <Box height={measure.y1} bg="gray200" width="100%" mb="y24" />
        </>
    );
}

export const RoutesHeader = memo(RoutesHeaderComponent);
