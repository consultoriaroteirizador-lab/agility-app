import React from "react";
import { Modal } from "react-native";



import { ActivityIndicator, Box, LocalIconButton, ScreenBase, Text } from "@/components";
import { useAppSafeArea } from "@/hooks";
import { measure } from "@/theme";

import Keyboard from "../Keyboard/Keyboard";



interface PasswordModalProps<TParams = void, TResult = void> {
    visible: boolean;
    onClose: () => void;
    title: string;
    confirmAction: (params?: TParams) => TResult;
    setPin: (pin: string) => void;
    pin: string;
    errorMessage?: string,
    isLoading: boolean
}




export default function PasswordModal({ visible, onClose, title = "Confirmação de operação", confirmAction, pin, setPin, errorMessage, isLoading }: PasswordModalProps) {
    const { top, bottom } = useAppSafeArea();
    return (
        <Modal visible={visible} animationType="slide">
            <Box flex={1} style={{paddingTop: top, paddingBottom: bottom }} >
            <ScreenBase mtScreenBase='t0' scrollable mbScreenBase='b0' buttonLeft={<LocalIconButton size={measure.x18} onPress={onClose} iconName="backArrow" color="primary100" />} title={<Text preset="textTitleScreen">{title ?? 'Confirmação de operação'}</Text>}>
                <Box
                    alignItems="center"
                    flex={1}
                >
                    {
                        isLoading ? (
                            <Box flex={1} justifyContent="center" alignItems="center">
                                <ActivityIndicator />
                            </Box>
                        ) : (
                            <Box>
                                <Box flex={1} width={'100%'} mt="t10" paddingHorizontal="x14">
                                    <Box flex={1} mt='t20'>
                                        <Text textAlign="center" ml='l24' preset="textParagraph14" >Para validar a solicitação, digite a senha do seu <Text textAlign="center" preset="textParagraph14" fontWeightPreset="semibold">cartão convênio</Text> </Text>
                                        <Box flex={1} alignItems="center" >
                                            <Box alignItems='center' flex={1} flexDirection="row" justifyContent="center" gap='x36' width={measure.x300} >
                                                {Array(4)
                                                    .fill('')
                                                    .map((_, index) => (
                                                        <Box
                                                            key={index}
                                                            backgroundColor={pin[index] ? 'primary100' : 'white'}
                                                            borderColor={'primary100'}
                                                            borderWidth={measure.m2}
                                                            width={measure.x24}
                                                            height={measure.x24}
                                                            borderRadius='s12'
                                                            alignItems="center"
                                                            justifyContent="center">
                                                        </Box>
                                                    ))}
                                            </Box>
                                            {errorMessage && <Text mt="t4" preset="text14" color="redError">{errorMessage}</Text>}
                                            <Keyboard maxLength={4} currentValue={pin} setInputValue={setPin} confirmAction={confirmAction} />
                                        </Box>
                                    </Box>
                                </Box>
                                <Box alignItems="center" mt="t20" mb="b20">
                                    {/* <TextButton preset="primary" height={'auto'} paddingVertical="y8" title="Esqueceu sua senha" width={'auto'} paddingHorizontal="x56" /> */}
                                </Box>
                            </Box>
                        )
                    }
                </Box>
            </ScreenBase>
            </Box>
                        
        </Modal>
    )
}
