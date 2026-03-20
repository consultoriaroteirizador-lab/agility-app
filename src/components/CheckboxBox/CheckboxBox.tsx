import { BouncyCheckboxProps, BasePressableProps } from "react-native-bouncy-checkbox";
import BouncyCheckbox from "react-native-bouncy-checkbox";

import { colors, measure, ThemeSpace } from "@/theme";

import { Box, BoxBackGroundProps } from "../BoxBackGround/BoxBackGround";
import { Text, TextProps } from "../Text/Text";

type ComposeProps = BasePressableProps & BouncyCheckboxProps & BoxBackGroundProps;

interface CheckboxBoxProps extends ComposeProps {
    title?: string;
    gap?: ThemeSpace;
    textPreset?: TextProps["preset"];
}

export default function Checkbox({ title, gap = 'x24', textPreset = 'textParagraph', ...rest }: CheckboxBoxProps) {
    return (
        <Box flexDirection="row" alignItems="center" gap={gap} >
            <BouncyCheckbox
                fillColor={colors.primary100}
                innerIconStyle={{ borderWidth: measure.m1Dot5, borderRadius: measure.x6 }}
                {...rest}
            />
            {title && <Text preset={textPreset}>{title}</Text>}
        </Box>
    );
}
