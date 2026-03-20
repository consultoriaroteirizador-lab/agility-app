

import { Box, BoxBackGroundProps } from "../BoxBackGround/BoxBackGround";
import { Text, TextProps } from "../Text/Text";

interface ColumnItemProps extends BoxBackGroundProps {
    label: string;
    value: string;
    labelStyle?: TextProps;
    valueStyle?: TextProps;
}
export function ColumnItem({ label, value, labelStyle, valueStyle, ...boxBackGroundProps }: ColumnItemProps) {


    return (
        <Box justifyContent="space-between" {...boxBackGroundProps}>
            <Text preset="textParagraphSmall" {...labelStyle}>{label}</Text>
            <Text preset="textParagraphSmall" {...valueStyle}>{value}</Text>
        </Box>
    )
}