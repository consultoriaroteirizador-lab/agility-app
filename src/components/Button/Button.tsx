
import { measure, TextVariantsPreset } from '@/theme';

import { Icon, IconNameMaterial } from '../Icon/Icon';
import {
  TouchableOpacityBox,
  TouchableOpacityBoxProps,
} from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

import { buttonPresets } from './buttonPreset';

export type ButtonPreset = 'main' | 'outline';

interface ButtonProps extends TouchableOpacityBoxProps {
  title: string;
  presetText?: TextVariantsPreset;
  iconName?: IconNameMaterial;
  preset?: ButtonPreset;
  disabled?: boolean;
}

export function Button({
  title,
  iconName,
  presetText = 'textLabelButton',
  preset = 'main',
  disabled,
  ...TouchableOpacityBoxProps
}: ButtonProps) {
  const buttonPreset = buttonPresets[preset]?.[disabled ? 'disabled' : 'default'];

  if (!buttonPreset || !buttonPreset.container) {
    console.error('Button preset not found:', { preset, disabled });
    return null;
  }

  return (
    <TouchableOpacityBox
      flexDirection='row'
      gap='x4'
      disabled={disabled}
      paddingHorizontal="x20"
      height={measure.y50}
      width={measure.x330}
      alignItems="center"
      justifyContent="center"
      borderRadius="s8"
      {...(buttonPreset.container || {})}
      {...TouchableOpacityBoxProps}
    >
      {iconName && <Icon color={preset === 'main' ? 'white' : 'primary100'} name={iconName!} />}
      <Text
        preset={presetText}
        color={buttonPreset.content}>
        {title}
      </Text>

    </TouchableOpacityBox>
  );
}
