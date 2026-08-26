import { useCallback, useMemo } from 'react';

import { Box, Button, Input, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { DocumentCollectionForm, DocumentData } from '@/components/DocumentCollectionForm';
import Modal from '@/components/Modal/Modal';
import { MultiPhotoPicker } from '@/components/MultiPhotoPicker';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { requirementsForServiceType } from '@/domain/agility/company/completionRequirements';
import { RECIPIENT_STEP_TITLES } from '@/domain/agility/company/recipientRelations';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { resolvePreviousStep } from '../../_utils/completionStep';
import { validateCompletion } from '../../_utils/completionValidation';

interface SharedEtapaDadosProps {
  serviceType: 'entrega' | 'coleta' | 'servico';
}

const LABELS = {
  entrega: {
    title: 'Dados da entrega',
    photosLabel: 'Fotos da entrega',
    observationPlaceholder: 'Descreva observações sobre a entrega',
    modalTitle: 'Assinatura',
  },
  coleta: {
    title: 'Dados da coleta',
    photosLabel: 'Fotos da coleta',
    observationPlaceholder: 'Descreva observações sobre a coleta',
    modalTitle: 'Assinatura de quem entregou',
  },
  servico: {
    title: 'Dados do Serviço',
    photosLabel: 'Fotos do serviço',
    observationPlaceholder: 'Descreva observações sobre o serviço',
    modalTitle: 'Assinatura do responsável',
  },
};

export function SharedEtapaDados({ serviceType }: SharedEtapaDadosProps) {
  const labels = LABELS[serviceType];
  const { showToast } = useToastService();

  const {
    recipient,
    updateRecipient,
    observation,
    setObservation,
    signature,
    photos,
    uploadProgress,
    showSignature,
    setShowSignature,
    setEtapa,
    setDelivered,
    setSignature,
    setPhotos,
    completionRequirements,
  } = useParada();

  const documentData: DocumentData = {
    recipientName: recipient?.nome || '',
    documentType: (recipient?.tipoDocumento || 'RG') as 'RG' | 'CPF' | 'OUTRO',
    documentNumber: recipient?.numeroDocumento || '',
  };

  const handleDocumentChange = (data: DocumentData) => {
    updateRecipient({
      nome: data.recipientName,
      tipoDocumento: data.documentType,
      numeroDocumento: data.documentNumber,
    });
  };

  const requirements = requirementsForServiceType(completionRequirements, serviceType);

  // A volta e config-aware, espelhando a ida: se a etapa de recebedor estiver
  // oculta, "voltar" nao existe mais como etapa 3 — devolve o motorista ao
  // ponto de decisao (etapa 2) e reabre a pergunta ("Entreguei?").
  const handleBack = useCallback(() => {
    const { etapa, resetDelivered } = resolvePreviousStep({ from: 'data', requirements });
    setEtapa(etapa);
    if (resetDelivered) setDelivered(false);
  }, [setEtapa, setDelivered, requirements]);

  const { canProceed, missing } = useMemo(
    () =>
      validateCompletion(requirements, {
        recipientTipo: recipient?.tipo,
        nome: recipient?.nome,
        documento: recipient?.numeroDocumento,
        hasSignature: !!signature,
        photoCount: photos.length,
      }),
    [requirements, recipient?.tipo, recipient?.nome, recipient?.numeroDocumento, signature, photos.length],
  );

  const handleNext = () => {
    if (!canProceed) {
      showToast({ message: `Preencha os campos obrigatórios: ${missing.join(', ')}`, type: 'error' });
      return;
    }
    setEtapa(5);
  };

  return (
    <ScreenBase
      buttonLeft={<ButtonBack onPress={handleBack} />}
      title={
        <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
          {labels.title}
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white">
        <Box scrollable pb="b32">
          <Box paddingTop="y24" paddingBottom="y4">
            {requirements.recipientIdentity !== 'HIDDEN' && (
              <DocumentCollectionForm
                data={documentData}
                onChange={handleDocumentChange}
                nameLabel={RECIPIENT_STEP_TITLES[serviceType].nameLabel}
              />
            )}

            {requirements.signature !== 'HIDDEN' && (
              <Box marginBottom="y12" mt="t14">
                <Box flexDirection="row" alignItems="center" gap="x4" marginBottom="y4">
                  <Text preset="text14" color="gray600" fontWeightPreset="bold">
                    Assinatura
                  </Text>
                  {requirements.signature === 'REQUIRED' && (
                    <Text preset="text12" color="primary100" fontWeightPreset="bold">
                      *Obrigatório
                    </Text>
                  )}
                </Box>
                <Button
                  onPress={() => setShowSignature(true)}
                  backgroundColor={signature ? 'primary40' : 'primary100'}
                  width={measure.x330}
                  title={signature ? 'Assinatura registrada ✓' : 'Registrar assinatura'}
                />
              </Box>
            )}

            {requirements.photos.mode !== 'HIDDEN' && (
              <Box marginBottom="y12" mt="t14">
                <Box flexDirection="row" alignItems="center" gap="x4" marginBottom="y4">
                  <Text preset="text14" color="gray600" fontWeightPreset="bold">
                    {labels.photosLabel}
                  </Text>
                  {requirements.photos.mode === 'REQUIRED' && (
                    <Text preset="text12" color="primary100" fontWeightPreset="bold">
                      *Obrigatório
                    </Text>
                  )}
                </Box>
                {/* `photoSize` explicito: o default do MultiPhotoPicker e
                    (largura da tela - 64) / 3, ~99dp num aparelho de 360dp — dois
                    quadroes que empurravam observacao e botoes para fora da
                    dobra. 80dp reduz ~19% e mantem a miniatura grande o bastante
                    para o motorista conferir a foto que tirou. 64dp foi testado e
                    ficou pequeno demais. */}
                <MultiPhotoPicker
                  photos={photos}
                  onPhotosChange={setPhotos}
                  maxPhotos={5}
                  uploadProgress={uploadProgress}
                  label="Fotos"
                  allowCamera={true}
                  labelPreset="textParagraph"
                  padding="y4"
                  backgroundColor="gray50"
                  photoSize={measure.m80}
                />
              </Box>
            )}

            <Box marginBottom="y12">
              <Input
                title="Observação"
                value={observation}
                onChangeText={setObservation}
                placeholder={labels.observationPlaceholder}
                multiline
                numberOfLines={4}
                width={measure.x330}
              />
            </Box>

            <Box paddingBottom="y24">
              <Button
                title="Próximo"
                onPress={handleNext}
                width={measure.x330}
                disabled={!canProceed}
              />
              {!canProceed && (
                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                  * Obrigatório: {missing.join(', ')}
                </Text>
              )}
            </Box>
          </Box>
        </Box>

        <Modal
          title="Assinatura"
          isVisible={showSignature}
          onClose={() => setShowSignature(false)}
        >
          <Box paddingHorizontal="x10" paddingTop="t10" paddingBottom="y10">
            <Text preset="text16" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b10" textAlign="center">
              {labels.modalTitle}
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
    </ScreenBase>
  );
}
