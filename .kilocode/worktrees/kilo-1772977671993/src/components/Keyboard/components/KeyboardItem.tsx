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
        <TouchableOpacityBox flex={1} onPress={onPress} activeOpacity={1} {...boxBackGroundProps} alignItems="center" justifyContent="center">
            <Text color="gray600" preset="text30">{value}</Text>
        </TouchableOpacityBox>
    )
}


