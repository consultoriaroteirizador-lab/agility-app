import { useCallback, useMemo } from 'react';

import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';

import { TransferStepHeader } from './TransferStepHeader';

/**
 * Finalização da COLETA na origem (perna 1 do TRANSFER). Valida a evidência
 * (recebedor + foto + assinatura) e chama `commitPickupLeg`, que faz o snapshot
 * em `pickupEvidence` e avança o wizard para a entrega no destino.
 */
export function TransferEtapaFinalizarColeta() {
    const {
        checklist,
        updateChecklist,
        showSignature,
        setShowSignature,
        setSignature,
        setPhotos,
        setEtapa,
        recipient,
        photos,
        signature,
        commitPickupLeg,
    } = useParada();
    const { showToast } = useToastService();

    const safe = {
        documento: checklist?.documento ?? false,
        foto: checklist?.foto ?? false,
        signature: checklist?.signature ?? false,
    };

    const canCommit = useMemo(() => {
        const hasDoc = !!(checklist?.documento && recipient?.nome?.trim() && recipient?.numeroDocumento?.trim());
        return hasDoc && photos.length > 0 && !!signature;
    }, [checklist?.documento, recipient?.nome, recipient?.numeroDocumento, photos.length, signature]);

    const handleBack = useCallback(() => setEtapa(4), [setEtapa]);

    const handleConcluirColeta = useCallback(() => {
        const uploading = (photos as { __uploadStatus?: string }[]).some((p) => p.__uploadStatus === 'uploading');
        if (uploading) {
            showToast({ message: 'Aguarde o upload das fotos terminar.', type: 'error' });
            return;
        }
        commitPickupLeg();
    }, [photos, commitPickupLeg, showToast]);

    return (
        <ScreenBase
            buttonLeft={<ButtonBack onPress={handleBack} />}
            title={
                <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
                    Confirmar coleta
                </Text>
            }
        >
            <Box flex={1} backgroundColor="white">
                <Box scrollable style={{ paddingBottom: 32 }}>
                    <Box paddingTop="y24" paddingBottom="y4">
                        <TransferStepHeader leg="pickup" />

                        <Text preset="text14" color="gray600" marginBottom="y12">
                            Confirme a evidência da coleta na origem para seguir para a entrega no destino:
                        </Text>

                        <Box gap="y12">
                            {/* Documento de quem entregou na origem */}
                            <Row
                                label="Documento de quem entregou"
                                ok={safe.documento}
                                onConfirm={() => setEtapa(4)}
                                onClear={() => updateChecklist('documento', false)}
                            />
                            {/* Foto */}
                            <Row
                                label="Foto da carga"
                                ok={safe.foto}
                                onConfirm={() => updateChecklist('foto', true)}
                                onClear={() => { setPhotos([]); updateChecklist('foto', false); }}
                            />
                            {/* Assinatura */}
                            <Row
                                label="Assinatura coletada"
                                ok={safe.signature}
                                onConfirm={() => setShowSignature(true)}
                                onClear={() => { setSignature(null); updateChecklist('signature', false); }}
                            />
                        </Box>

                        <Box marginTop="y24" paddingBottom="y24" alignItems="center">
                            <Button
                                title="Concluir coleta e ir ao destino"
                                onPress={handleConcluirColeta}
                                disabled={!canCommit}
                                width={measure.x330}
                            />
                            {!canCommit && (
                                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                                    * Documento, foto e assinatura são obrigatórios
                                </Text>
                            )}
                        </Box>
                    </Box>
                </Box>

                <Modal title="Assinatura" isVisible={showSignature} onClose={() => setShowSignature(false)}>
                    <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
                        <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b10" textAlign="center">
                            Assinatura
                        </Text>
                        <SignatureCanvas
                            onClear={() => setSignature(null)}
                            onSave={async (signatureUri: string) => {
                                setSignature(signatureUri);
                                setShowSignature(false);
                                updateChecklist('signature', true);
                            }}
                            height={measure.y280}
                            penColor="black"
                            backgroundColor="white"
                            preset="textParagraph"
                        />
                    </Box>
                </Modal>
            </Box>
        </ScreenBase>
    );
}

function Row({ label, ok, onConfirm, onClear }: { label: string; ok: boolean; onConfirm: () => void; onClear: () => void }) {
    return (
        <Box
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            padding="y4"
            borderWidth={measure.m1}
            borderColor={ok ? 'primary100' : 'borderColor'}
            borderRadius="s12"
            backgroundColor={ok ? 'primary10' : 'white'}
        >
            <Text preset="text16" color="colorTextPrimary" fontWeightPreset={ok ? 'bold' : 'regular'}>
                {label}
            </Text>
            <Box flexDirection="row" gap="y12">
                <TouchableOpacityBox
                    onPress={onClear}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="redError"
                    backgroundColor={!ok ? 'redError' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Text preset="text20" color={!ok ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                </TouchableOpacityBox>
                <TouchableOpacityBox
                    onPress={onConfirm}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="primary100"
                    backgroundColor={ok ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                >
                    <Text preset="text20" color={ok ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                </TouchableOpacityBox>
            </Box>
        </Box>
    );
}
