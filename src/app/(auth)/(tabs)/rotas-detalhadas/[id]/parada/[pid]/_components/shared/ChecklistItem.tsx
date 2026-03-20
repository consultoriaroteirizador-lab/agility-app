import { Box, TouchableOpacityBox, Text } from '@/components';
import { measure } from '@/theme';

interface ChecklistItemProps {
    label: string;
    isChecked: boolean;
    onCheck: () => void;
    onUncheck: () => void;
}

/**
 * Item de checklist com botões de confirmar e rejeitar
 */
export function ChecklistItem({ label, isChecked, onCheck, onUncheck }: ChecklistItemProps) {
    return (
        <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            padding="y12"
            borderWidth={measure.m1}
            borderColor={isChecked ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={isChecked ? 'primary10' : 'white'}
        >
            <Text
                preset="text16"
                color="colorTextPrimary"
                fontWeightPreset={isChecked ? 'bold' : 'regular'}
            >
                {label}
            </Text>
            <Box flexDirection="row" gap="x12">
                {/* Botão de rejeitar */}
                <TouchableOpacityBox
                    onPress={onUncheck}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="redError"
                    backgroundColor={!isChecked ? 'redError' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Text preset="text20" color={!isChecked ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                </TouchableOpacityBox>

                {/* Botão de confirmar */}
                <TouchableOpacityBox
                    onPress={onCheck}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="primary100"
                    backgroundColor={isChecked ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Text preset="text20" color={isChecked ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                </TouchableOpacityBox>
            </Box>
        </Box>
    );
}
