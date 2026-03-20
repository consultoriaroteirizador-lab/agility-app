import { ThemeColors } from '@/theme';

import { Icon, IconBaseProps } from '../Icon/Icon';
import {
  TouchableOpacityBox,
  TouchableOpacityBoxProps,
} from '../RestyleComponent/RestyleComponent';

interface IconButtonProps extends TouchableOpacityBoxProps {
  iconName: IconBaseProps['name'];
  size: number;
  color: ThemeColors;
}

export function IconButton({
  iconName,
  size,
  color,
  ...TouchableOpacityBoxProps
}: IconButtonProps) {
  return (
    <TouchableOpacityBox {...TouchableOpacityBoxProps}>
      <Icon
        name={iconName}
        size={size}
        color={color}
      />
    </TouchableOpacityBox>
  );
}
