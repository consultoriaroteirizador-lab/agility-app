import { Box, Text, TouchableOpacityBox } from '@/components';
import { measure } from '@/theme';

export type RecipientType = 'cliente' | 'porteiro' | 'vizinho' | 'familiar' | 'outro';

export interface RecipientOption {
  type: RecipientType;
  label: string;
}

export interface RecipientTypeSelectorProps {
  selectedType: RecipientType | null;
  onSelect: (type: RecipientType) => void;
  clienteName?: string;
  options?: RecipientOption[];
}

const DEFAULT_OPTIONS: RecipientOption[] = [
  { type: 'cliente', label: 'Cliente' },
  { type: 'porteiro', label: 'Porteiro' },
  { type: 'vizinho', label: 'Vizinho' },
  { type: 'familiar', label: 'Familiar' },
  { type: 'outro', label: 'Outro' },
];

export function RecipientTypeSelector({
  selectedType,
  onSelect,
  clienteName,
  options = DEFAULT_OPTIONS,
}: RecipientTypeSelectorProps) {
  // Substituir label do cliente pelo nome real se disponivel
  const renderedOptions = options.map((option) => ({
    ...option,
    label: option.type === 'cliente' && clienteName ? clienteName : option.label,
  }));

  return (
    <Box gap="y12">
      {renderedOptions.map((option) => {
        const isSelected = selectedType === option.type;

        return (
          <TouchableOpacityBox
            key={option.type}
            onPress={() => onSelect(option.type)}
            flexDirection="row"
            alignItems="center"
            gap="x12"
            padding="y12"
            borderWidth={measure.m2}
            borderColor={isSelected ? 'primary100' : 'gray200'}
            borderRadius="s12"
            backgroundColor={isSelected ? 'primary10' : 'white'}
          >
            {/* Radio indicator */}
            <Box
              width={measure.x24}
              height={measure.y24}
              borderRadius="s12"
              borderWidth={measure.m2}
              borderColor={isSelected ? 'primary100' : 'gray300'}
              backgroundColor={isSelected ? 'primary100' : 'transparent'}
              justifyContent="center"
              alignItems="center"
            >
              {isSelected && (
                <Box
                  width={measure.x12}
                  height={measure.y12}
                  borderRadius="s6"
                  backgroundColor="white"
                />
              )}
            </Box>

            {/* Label */}
            <Text
              preset="text16"
              color="colorTextPrimary"
              fontWeightPreset={isSelected ? 'bold' : 'regular'}
            >
              {option.label}
            </Text>
          </TouchableOpacityBox>
        );
      })}
    </Box>
  );
}
