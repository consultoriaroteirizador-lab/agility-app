import { Alert, View } from "react-native";

import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';

import { measure } from "@/theme";

import { IconButton } from "./IconButton";

interface ButtonShareProps {
    viewRef: React.RefObject<View | null>;
    setIsCapturing: (value: boolean) => void
}

export function ButtonShare({ viewRef, setIsCapturing }: ButtonShareProps) {

    const captureAndShare = async () => {
        if (!viewRef.current) {
            Alert.alert("Erro", "Referência da visualização não encontrada.");
            return;
        }

        setIsCapturing(true);

        // Aguarda atualização do estado antes de capturar
        setTimeout(async () => {
            try {
                const uri = await captureRef(viewRef.current!, {
                    format: 'png',
                    quality: 0.8,
                });
                // Removido: await MediaLibrary.createAssetAsync(uri);
                // O compartilhamento funciona diretamente sem salvar na galeria
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(uri);
                } else {
                    Alert.alert('Compartilhamento não disponível neste dispositivo');
                }
            } catch {
                Alert.alert('Erro ao capturar e compartilhar');
            } finally {
                setIsCapturing(false);
            }
        }, 100);
    };


    return (
        <IconButton size={measure.m28} onPress={captureAndShare} iconName="share" color="primary100" />
    )
}