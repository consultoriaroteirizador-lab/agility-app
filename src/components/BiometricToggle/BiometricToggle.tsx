import { memo } from 'react';
import { Switch } from 'react-native';

import { ActivityIndicator, Box, Text, TouchableOpacityBox } from '@/components';
import { useAppTheme } from '@/hooks/useAppTheme';
import { measure } from '@/theme';

interface BiometricToggleProps {
    isEnabled: boolean;
    isLoading: boolean;
    disabled: boolean;
    onToggle: () => void;
}

function BiometricToggleComponent({
    isEnabled,
    isLoading,
    disabled,
    onToggle,
}: BiometricToggleProps) {
    const { colors } = useAppTheme();

    const thumbColor = isEnabled ? colors.primary100 : colors.gray300;

    return (
        <TouchableOpacityBox
            onPress={onToggle}
            disabled={disabled || isLoading}
            opacity={disabled ? 0.6 : 1}
        >
            <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                backgroundColor="white"
                px="x16"
                py="y12"
                borderRadius="s12"
                borderWidth={measure.m1}
                borderColor={isEnabled ? 'primary100' : 'gray200'}
            >
                <Box flex={1}>
                    <Text
                        preset="text16"
                        color="colorTextPrimary"
                        fontWeightPreset='semibold'
                    >
                        Login com biometria
                    </Text>
                    <Text
                        preset="text12"
                        color="secondaryTextColor"
                        mt="y4"
                    >
                        {isEnabled ? 'Ativado' : 'Desativado'}
                    </Text>
                </Box>
                {isLoading ? (
                    <ActivityIndicator size="small" />
                ) : (
                    <Switch
                        value={isEnabled}
                        onValueChange={onToggle}
                        trackColor={{ false: colors.gray200, true: colors.primary40 }}
                        thumbColor={thumbColor}
                        ios_backgroundColor={colors.gray200}
                        style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                    />
                )}
            </Box>
        </TouchableOpacityBox>
    );
}

export const BiometricToggle = memo(BiometricToggleComponent);
