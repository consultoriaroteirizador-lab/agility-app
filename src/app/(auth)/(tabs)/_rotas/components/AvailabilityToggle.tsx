import { memo } from 'react';
import { Switch } from 'react-native';

import { ActivityIndicator, Box, Text } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { measure } from '@/theme';

interface AvailabilityToggleProps {
    isAvailable: boolean;
    isLoading: boolean;
    disabled: boolean;
    onToggle: () => void;
}

function AvailabilityToggleComponent({
    isAvailable,
    isLoading,
    disabled,
    onToggle,
}: AvailabilityToggleProps) {
    const { colors } = useAppTheme();

    const thumbColor = isAvailable ? colors.primary100 : colors.gray300;

    return (
        <Box
            alignItems="center"
            mb="y24"
            opacity={disabled ? 0.6 : 1}
        >
            <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                backgroundColor="white"
                px="x16"
                py="y12"
                borderRadius="s20"
                borderWidth={measure.m1}
                borderColor={isAvailable ? 'primary100' : 'gray200'}
                minWidth={180}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" />
                ) : (
                    <Switch
                        value={isAvailable}
                        onValueChange={onToggle}
                        disabled={disabled}
                        trackColor={{ false: colors.gray200, true: colors.primary40 }}
                        thumbColor={thumbColor}
                        ios_backgroundColor={colors.gray200}
                        style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                    />
                )}
                <Text
                    preset="text14"
                    color={isAvailable ? 'primary100' : 'gray400'}
                    ml="x8"
                    fontWeight={isAvailable ? '600' : '400'}
                >
                    {isAvailable ? 'Disponível' : 'Indisponível'}
                </Text>
            </Box>
        </Box>
    );
}

export const AvailabilityToggle = memo(AvailabilityToggleComponent);
