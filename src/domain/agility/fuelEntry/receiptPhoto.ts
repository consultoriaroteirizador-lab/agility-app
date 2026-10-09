import * as ImageManipulator from 'expo-image-manipulator';

import type { ReceiptPhoto } from './dto/types';

const LONGEST_SIDE = 1600;

/**
 * JPEG 0,7 como o comprovante de entrega, mas só o lado MAIOR é limitado: passar largura e altura juntas
 * (como o `compressImage` faz) estica a foto num quadrado, e a nota fiscal deixa de ser legível.
 * Falhou a compressão: segue com a original, como o comprovante.
 */
export async function compressReceipt(photo: ReceiptPhoto): Promise<string> {
    const longest = Math.max(photo.width, photo.height);
    const actions = longest > LONGEST_SIDE
        ? [{ resize: photo.width >= photo.height ? { width: LONGEST_SIDE } : { height: LONGEST_SIDE } }]
        : [];
    try {
        const result = await ImageManipulator.manipulateAsync(photo.uri, actions, { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG });
        return result.uri;
    } catch {
        return photo.uri;
    }
}
