import { MaterialIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/hooks';
import { measure, ThemeColors } from '@/theme';



export interface IconBaseProps extends React.ComponentProps<typeof MaterialIcons> {
    color?: ThemeColors
}

export function Icon({ size = measure.m20, name, color = "primary100", ...rest }: IconBaseProps) {
    const { colors } = useAppTheme();
    return (
        <MaterialIcons
            name={name}
            size={size}
            color={colors[color]}
            {...rest}
        />
    )
}


export type IconNameMaterial = keyof typeof MaterialIcons.glyphMap;