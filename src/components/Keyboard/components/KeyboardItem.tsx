import { ReactNode } from "react";

import { BoxBackGroundProps } from "@/components/BoxBackGround/BoxBackGround";
import { TouchableOpacityBox } from "@/components/RestyleComponent/RestyleComponent";
import { Text } from "@/components/Text/Text";

interface KeyboardItemProps extends BoxBackGroundProps {
    value: ReactNode;
    onPress?: () => void;
}

export default function KeyboardItem({ value, onPress, ...boxBackGroundProps }: KeyboardItemProps) {

    return (
        <TouchableOpacityBox
            flex={1}
            onPress={onPress}
            activeOpacity={1}
            alignItems="center"
            justifyContent="center"
            onBlur={boxBackGroundProps.onBlur as ((e: any) => void) | undefined}
            {...({ ...boxBackGroundProps, onBlur: undefined } as any)}
        >
            <Text color="gray600" preset="text30">{value}</Text>
        </TouchableOpacityBox>
    )
}


