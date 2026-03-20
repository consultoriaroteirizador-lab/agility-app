import { ReactElement, useRef } from "react";
import { View } from "react-native";

import { goHomeScreen } from "@/routes";
import { $shadowProps, measure } from "@/theme";

import { LogoHorizontal } from "..";
import { Box } from "../BoxBackGround/BoxBackGround";
import { ButtonShare } from "../Button/ButtonShare";
import { Text } from "../Text/Text";



interface ProofProps {
    children: ReactElement,
    isCapturing: boolean,
    setIsCapturing: (value: boolean) => void,
    invalidateQuery?: () => void,
    title: string
}

export function Proof({ children, isCapturing, setIsCapturing, invalidateQuery, title }: ProofProps) {

    const viewRef = useRef<View>(null);

    function handleGoHomeScreen() {
        if (invalidateQuery) {
            invalidateQuery()
        }
        goHomeScreen()
    }

    return (

        <Box
            alignSelf="center"
            ref={viewRef}
            paddingHorizontal="x20"
            borderRadius="s12"
            width={isCapturing ? measure.y310 : measure.y360}
            mt="y12Negative"
            style={$shadowProps}
            borderWidth={measure.m1}
            borderColor="gray100"
            height={measure.y90}
            backgroundColor="white"
            alignItems="center"
            paddingBottom="b32"
            flex={1}
        >
            <Box flex={1} width={'100%'} pb="b10">
                <Box flexDirection="row" justifyContent={isCapturing ? "center" : "center"} alignItems="center">
                    <Box alignSelf="center">
                        <LogoHorizontal color="" height={measure.y100} width={measure.x140} />
                    </Box>
                    {!isCapturing && <Box marginLeft="l32"><ButtonShare viewRef={viewRef} setIsCapturing={setIsCapturing} /></Box>}
                </Box>
                <Box flexDirection="row" alignItems="center" alignSelf={"center"} mb="b18">
                    <Text preset="textParagraph" textAlign="center">{title}</Text>
                </Box>
                <Box flex={1}>
                    {children}
                </Box>
            </Box>
        </Box>

    )
}

