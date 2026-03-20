import { memo } from 'react';
import { Switch } from 'react-native';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

interface AvailabilityToggleProps {
    isAvailable: boolean;
    isLoading: boolean;
    disabled: boolean;
    onToggle: () => void;
}

// Driver availability toggle with switch UI
function AvailabilityToggleComponent({
    isAvailable,
    isLoading,
    disabled,
    onToggle,
}: AvailabilityToggleProps) {
    const trackColor = isAvailable ? '#7063F0' : '#D5D5D5';
    const thumbColor = isAvailable ? '#7063F0' : '#ABB3BB';

    return (
        <TouchableOpacityBox
            alignItems="center"
            mb="y24"
            onPress={onToggle}
            disabled={disabled || isLoading}
            opacity={disabled ? 0.6 : 1}
        >
            <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                bg="white"
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
                        trackColor={{ false: '#D5D5D5', true: '#C6C1F9' }}
                        thumbColor={thumbColor}
                        ios_backgroundColor="#D5D5D5"
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
        </TouchableOpacityBox>
    );
}

export const AvailabilityToggle = memo(AvailabilityToggleComponent);
