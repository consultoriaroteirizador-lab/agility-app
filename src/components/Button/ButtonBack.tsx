import { router } from "expo-router";

import { measure } from "@/theme";

import { LocalIconButton } from "./LocalIconButton";

interface ButtonBackProps {
    onPress?: () => void
}

export function ButtonBack({ onPress }: ButtonBackProps) {

    return (
        <LocalIconButton size={measure.y18} onPress={onPress ?? router.back} iconName="backArrow" color="primary100" />
    )
}