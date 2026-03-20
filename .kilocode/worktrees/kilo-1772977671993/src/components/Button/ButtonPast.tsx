import React from "react";

import * as Clipboard from "expo-clipboard";

import { measure } from "@/theme";

import { FontWeightPreset } from "../Text/Text";

import { TextButton } from "./TextButton"; // Certifique-se de importar corretamente

interface ButtonPasteProps {
    onPaste: (text: string) => void;
    fontWeight?: FontWeightPreset;
    fontSize?: number;
    disabled?: boolean;
}

export function ButtonPaste({ onPaste, fontSize = measure.f14, fontWeight, disabled = false, ...textButtonProps }: ButtonPasteProps) {

    async function pasteFromClipboard() {
        try {
            const text = await Clipboard.getStringAsync();
            if (text) {
                onPaste(text);
            }
        } catch {
            // Erro tratado silenciosamente
        }
    }

    return (
        <TextButton
            fontSize={fontSize}
            fontWeight={fontWeight}
            onPress={pasteFromClipboard}
            color="primary100"
            preset="primary"
            title="Colar"
            disabled={disabled}
            {...textButtonProps}
        />
    );
}
