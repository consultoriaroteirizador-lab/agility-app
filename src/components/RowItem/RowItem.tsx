
import { Box, BoxBackGroundProps } from "../BoxBackGround/BoxBackGround";
import { Text, TextProps } from "../Text/Text";

interface RowItemProps extends BoxBackGroundProps {
    label: string;
    value: string;
    labelStyle?: TextProps;
    valueStyle?: TextProps;
}
export function RowItem({ label, value, labelStyle, valueStyle, ...boxBackGroundProps }: RowItemProps) {
    return (
        <Box flexDirection="row" justifyContent="space-between" width={'100%'} {...boxBackGroundProps}>
            <Text preset="textParagraphSmall" {...labelStyle}>{label}</Text>
            <Text preset="textParagraphSmall" {...valueStyle}>{value}</Text>
        </Box>
    )
}