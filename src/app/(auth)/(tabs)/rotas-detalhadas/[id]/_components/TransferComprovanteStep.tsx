import { useState } from 'react';

import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { Box, Button, LocalIcon, Text } from '@/components';
import { DocumentCollectionForm, type DocumentData } from '@/components/DocumentCollectionForm';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useRoutingHandoff } from '@/domain/agility/routing/useCase/useRoutingHandoff';
import { uploadBase64Signature, uploadMultipleServicePhotos } from '@/domain/agility/service/serviceUploadUtils';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useRota } from '../_context/RotaContext';

import { TransferOrderList } from './TransferOrderList';

/**
 * Etapa 2 (comprovante) da tela de transferência: quem recebeu + documento,
 * foto/assinatura e o disparo do handoff (POST /routings/:id/handoff).
 *
 * Reorganiza a lógica que existia na v1 do TransferLegExecution (removida na
 * Task 3), agora enriquecida com DocumentCollectionForm (nome + tipo/número
 * de documento) no lugar do campo de nome solto.
 */
export function TransferComprovanteStep({ routingId, onBack }: { routingId: string; onBack: () => void }) {
    const { paradas } = useRota();
    const { showToast } = useToastService();
    const [doc, setDoc] = useState<DocumentData>({ recipientName: '', documentType: 'RG', documentNumber: '' });
    const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
    const [signature, setSignature] = useState<string | null>(null);
    const [showSignature, setShowSignature] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [done, setDone] = useState(false);

    const { handoff } = useRoutingHandoff({
        onSuccess: () => {
            setDone(true);
            setTimeout(() => router.replace('/(auth)/(tabs)'), 2000);
        },
        onError: () => {
            setSubmitting(false);
            showToast({ message: 'Não foi possível registrar a entrega. Tente novamente.', type: 'error' });
        },
    });

    const canSubmit = doc.recipientName.trim().length > 0 && (photos.length > 0 || !!signature);

    async function onConfirm() {
        if (!canSubmit || submitting) return;
        setSubmitting(true);

        const [photoUrls, signatureUrl] = await Promise.all([
            photos.length
                ? uploadMultipleServicePhotos(photos, routingId).catch(() => [] as string[])
                : Promise.resolve([] as string[]),
            signature
                ? uploadBase64Signature(signature, routingId).catch(() => null)
                : Promise.resolve<string | null>(null),
        ]);

        // Se o motorista anexou comprovante mas TUDO falhou no upload (ex.: rede
        // ruim no CD), NÃO seguir com um handoff sem prova — o comprovante é o
        // motivo desta tela. Aborta e pede pra tentar de novo.
        const anexouProva = photos.length > 0 || !!signature;
        if (anexouProva && photoUrls.length === 0 && !signatureUrl) {
            setSubmitting(false);
            showToast({ message: 'Falha ao enviar foto/assinatura. Verifique a conexão e tente novamente.', type: 'error' });
            return;
        }

        const docNote = doc.documentNumber.trim() ? `${doc.documentType}: ${doc.documentNumber.trim()}` : undefined;

        handoff({
            id: routingId,
            payload: {
                proof: {
                    receivedBy: doc.recipientName.trim(),
                    photoProof: photoUrls.length ? photoUrls : undefined,
                    signature: signatureUrl ?? undefined,
                    notes: docNote,
                },
            },
        });
    }

    if (done) {
        return (
            <Box flex={1} backgroundColor="primary100" justifyContent="center" alignItems="center" px="x24">
                <LocalIcon iconName="check" size={measure.m40} color="white" />
                <Text preset="text18" color="white" textAlign="center" mt="y16">
                    Transferência concluída{'\n'}com sucesso
                </Text>
            </Box>
        );
    }

    return (
        <Box gap="y16">
            <Box backgroundColor="secondary10" p="y12" borderRadius="s12">
                <Text preset="text13" color="gray700">
                    Confirme o recebimento do lote ({paradas.length} pedido{paradas.length === 1 ? '' : 's'}) no CD de destino.
                </Text>
            </Box>

            <TransferOrderList paradas={paradas} />

            <DocumentCollectionForm data={doc} onChange={setDoc} />

            <MultiPhotoPicker
                photos={photos}
                onPhotosChange={setPhotos}
                label="Foto da carga (opcional se houver assinatura)"
                maxPhotos={5}
                allowCamera
                photoSize={88}
            />

            <Box>
                <Text preset="text12" color="gray600" mb="b4">
                    Assinatura (opcional se houver foto)
                </Text>
                <Button
                    preset="outline"
                    title={signature ? 'Assinatura registrada ✓' : 'Registrar assinatura'}
                    onPress={() => setShowSignature(true)}
                />
            </Box>

            <Box gap="y12" pb="y24">
                <Button title="Registrar entrega da carga" onPress={onConfirm} disabled={!canSubmit || submitting} isLoading={submitting} />
                {!canSubmit ? (
                    <Text preset="text12" color="gray500" textAlign="center">
                        * Informe quem recebeu e anexe uma foto ou assinatura.
                    </Text>
                ) : null}
                <Button title="Voltar" onPress={onBack} preset="outline" />
            </Box>

            <Modal title="Assinatura" isVisible={showSignature} onClose={() => setShowSignature(false)}>
                <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
                    <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b10" textAlign="center">
                        Assinatura do recebedor
                    </Text>
                    <SignatureCanvas
                        onClear={() => setSignature(null)}
                        onSave={async (signatureUri: string) => {
                            setSignature(signatureUri);
                            setShowSignature(false);
                        }}
                        height={measure.y280}
                        penColor="black"
                        backgroundColor="white"
                        preset="textParagraph"
                    />
                </Box>
            </Modal>
        </Box>
    );
}
