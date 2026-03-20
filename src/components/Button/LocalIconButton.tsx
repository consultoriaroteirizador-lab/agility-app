import { ThemeColors } from '@/theme';

import { LocalIcon, LocalIconName } from '../Icon/LocalIcon';
import {
  TouchableOpacityBox,
  TouchableOpacityBoxProps,
} from '../RestyleComponent/RestyleComponent';

interface LocalIconButtonProps extends TouchableOpacityBoxProps {
  iconName: LocalIconName;
  size: number;
  color?: ThemeColors;
}

export function LocalIconButton({
  iconName,
  size,
  color,
  ...TouchableOpacityBoxProps
}: LocalIconButtonProps) {
  return (
    <TouchableOpacityBox {...TouchableOpacityBoxProps}>
      <LocalIcon
        iconName={iconName}
        size={size}
        color={color}
      />
    </TouchableOpacityBox>
  );
}
