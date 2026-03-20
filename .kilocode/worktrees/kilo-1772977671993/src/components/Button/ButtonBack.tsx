import { router } from "expo-router";

import { measure } from "@/theme";

import { LocalIconButton } from "./LocalIconButton";

export function ButtonBack() {

    return (
        <LocalIconButton heightIcon={measure.y18} size={measure.x18} onPress={router.back} iconName="backArrow" color="primary100" />
    )
}