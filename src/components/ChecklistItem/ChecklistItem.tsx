import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

export interface ChecklistItemProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  onAddPress?: () => void;
  showAddButton?: boolean;
}

export function ChecklistItem({
  label,
  value,
  onChange,
  onAddPress,
  showAddButton = false,
}: ChecklistItemProps) {
  return (
    <Box
      flexDirection="row"
      justifyContent="space-between"
      alignItems="center"
      padding="y12"
      borderWidth={measure.m1}
      borderColor={value ? 'primary100' : 'gray200'}
      borderRadius="s12"
      backgroundColor={value ? 'primary10' : 'white'}
    >
      <Text
        preset="text16"
        color="colorTextPrimary"
        fontWeightPreset={value ? 'bold' : 'regular'}
      >
        {label}
      </Text>

      <Box flexDirection="row" gap="x12">
        {/* Botao NAO */}
        <TouchableOpacityBox
          onPress={() => onChange(false)}
          width={measure.x44}
          height={measure.y44}
          borderRadius="s12"
          borderWidth={measure.m2}
          borderColor="redError"
          backgroundColor={!value ? 'redError' : 'transparent'}
          justifyContent="center"
          alignItems="center"
        >
          <Text
            preset="text20"
            color={!value ? 'white' : 'redError'}
            fontWeightPreset="bold"
          >
            ×
          </Text>
        </TouchableOpacityBox>

        {/* Botao SIM ou ADD */}
        {showAddButton && !value ? (
          <TouchableOpacityBox
            onPress={onAddPress}
            width={measure.x44}
            height={measure.y44}
            borderRadius="s12"
            borderWidth={measure.m1}
            borderColor="gray200"
            backgroundColor="gray100"
            justifyContent="center"
            alignItems="center"
          >
            <Text preset="text24" color="gray400">+</Text>
          </TouchableOpacityBox>
        ) : (
          <TouchableOpacityBox
            onPress={() => onChange(true)}
            width={measure.x44}
            height={measure.y44}
            borderRadius="s12"
            borderWidth={measure.m2}
            borderColor="primary100"
            backgroundColor={value ? 'primary100' : 'transparent'}
            justifyContent="center"
            alignItems="center"
          >
            <Text
              preset="text20"
              color={value ? 'white' : 'primary100'}
              fontWeightPreset="bold"
            >
              ✓
            </Text>
          </TouchableOpacityBox>
        )}
      </Box>
    </Box>
  );
}
