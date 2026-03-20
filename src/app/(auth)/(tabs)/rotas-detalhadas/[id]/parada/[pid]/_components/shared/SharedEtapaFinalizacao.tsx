import { useCallback } from 'react';

import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { measure } from '@/theme';

import { useParada } from '../../_context/ParadaContext';
import { useServiceCompletion } from '../../_hooks/useServiceCompletion';

interface SharedEtapaFinalizacaoProps {
  serviceType: 'entrega' | 'coleta' | 'servico';
}

const SERVICE_TYPE_LABELS = {
  entrega: { artigo: 'esta', substantivo: 'entrega' },
  coleta: { artigo: 'esta', substantivo: 'coleta' },
  servico: { artigo: 'este', substantivo: 'serviço' },
};

export function SharedEtapaFinalizacao({ serviceType }: SharedEtapaFinalizacaoProps) {
  console.log('[SharedEtapaFinalizacao] Renderizando...', { serviceType });

  const labels = SERVICE_TYPE_LABELS[serviceType];

  const {
    checklist,
    updateChecklist,
    showSignature,
    setShowSignature,
    setSignature,
    setPhotos,
    setEtapa,
  } = useParada();

  console.log('[SharedEtapaFinalizacao] useParada()', {
    checklist,
    showSignature,
  });

  // Safe access to checklist with defaults
  const safeChecklist = {
    documento: checklist?.documento ?? false,
    foto: checklist?.foto ?? false,
    signature: checklist?.signature ?? false,
  };

  console.log('[SharedEtapaFinalizacao] safeChecklist', safeChecklist);

  const { handleFinalizar, isCompleting, canFinalize } = useServiceCompletion();

  console.log('[SharedEtapaFinalizacao] useServiceCompletion()', {
    isCompleting,
    canFinalize,
  });

  const handleBack = useCallback(() => {
    setEtapa(4);
  }, [setEtapa]);

  const handleFinalizarWrapper = useCallback(() => {
    console.log(`[SharedEtapaFinalizacao] Finalizando ${serviceType}...`);
    // Importante: handleFinalizar é async, então capturamos erros aqui
    handleFinalizar().catch((error) => {
      console.error('[SharedEtapaFinalizacao] Erro não tratado:', error);
    });
  }, [handleFinalizar, serviceType]);

  return (
    <ScreenBase
      buttonLeft={<ButtonBack onPress={handleBack} />}
      title={
        <Text preset="textTitleScreen" fontWeightPreset="bold" color="colorTextPrimary">
          Verificação final
        </Text>
      }
    >
      <Box flex={1} backgroundColor="white">
        <Box scrollable style={{ paddingBottom: 32 }}>
          <Box paddingTop="y24" paddingBottom="y4">

            <Text preset="text14" color="gray600" marginBottom="y12">
              Verifique se coletou todos os dados necessários para finalizar {labels.artigo} {labels.substantivo}:
            </Text>

            <Box gap="y12">
              {/* Documento */}
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                padding="y4"
                borderWidth={measure.m1}
                borderColor={safeChecklist.documento ? 'primary100' : 'borderColor'}
                borderRadius="s12"
                backgroundColor={safeChecklist.documento ? 'primary10' : 'white'}
              >
                <Box flexDirection="row" alignItems="center" gap="x4">
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.documento ? 'bold' : 'regular'}>
                    Documento preenchido
                  </Text>
                </Box>
                <Box flexDirection="row" gap="y12">
                  <TouchableOpacityBox
                    onPress={() => updateChecklist('documento', false)}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="redError"
                    backgroundColor={!safeChecklist.documento ? 'redError' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={!safeChecklist.documento ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                  </TouchableOpacityBox>
                  <TouchableOpacityBox
                    onPress={() => setEtapa(4)}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="primary100"
                    backgroundColor={safeChecklist.documento ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={safeChecklist.documento ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                  </TouchableOpacityBox>
                </Box>
              </Box>

              {/* Foto */}
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                padding="y4"
                borderWidth={measure.m1}
                borderColor={safeChecklist.foto ? 'primary100' : 'borderColor'}
                borderRadius="s12"
                backgroundColor={safeChecklist.foto ? 'primary10' : 'white'}
              >
                <Text preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.foto ? 'bold' : 'regular'}>
                  Foto tirada
                </Text>
                <Box flexDirection="row" gap="y12">
                  <TouchableOpacityBox
                    onPress={() => {
                      setPhotos([]);
                      updateChecklist('foto', false);
                    }}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="redError"
                    backgroundColor={!safeChecklist.foto ? 'redError' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={!safeChecklist.foto ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                  </TouchableOpacityBox>
                  <TouchableOpacityBox
                    onPress={() => updateChecklist('foto', true)}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="primary100"
                    backgroundColor={safeChecklist.foto ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={safeChecklist.foto ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                  </TouchableOpacityBox>
                </Box>
              </Box>

              {/* Assinatura */}
              <Box
                flexDirection="row"
                justifyContent="space-between"
                alignItems="center"
                padding="y4"
                borderWidth={measure.m1}
                borderColor={safeChecklist.signature ? 'primary100' : 'borderColor'}
                borderRadius="s12"
                backgroundColor={safeChecklist.signature ? 'primary10' : 'white'}
              >
                <Box flexDirection="row" alignItems="center" gap="x4">
                  <Text preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.signature ? 'bold' : 'regular'}>
                    Assinatura coletada
                  </Text>
                </Box>
                <Box flexDirection="row" gap="y12">
                  <TouchableOpacityBox
                    onPress={() => {
                      setSignature(null);
                      updateChecklist('signature', false);
                    }}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="redError"
                    backgroundColor={!safeChecklist.signature ? 'redError' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={!safeChecklist.signature ? 'white' : 'redError'} fontWeightPreset="bold">×</Text>
                  </TouchableOpacityBox>
                  <TouchableOpacityBox
                    onPress={() => setShowSignature(true)}
                    width={measure.x44}
                    height={measure.y44}
                    borderRadius="s12"
                    borderWidth={measure.m2}
                    borderColor="primary100"
                    backgroundColor={safeChecklist.signature ? 'primary100' : 'transparent'}
                    justifyContent="center"
                    alignItems="center"
                  >
                    <Text preset="text20" color={safeChecklist.signature ? 'white' : 'primary100'} fontWeightPreset="bold">✓</Text>
                  </TouchableOpacityBox>
                </Box>
              </Box>
            </Box>

            <Box marginTop="y12" paddingBottom="y24">
              <Button
                title={isCompleting ? 'Finalizando...' : 'Finalizar'}
                onPress={handleFinalizarWrapper}
                disabled={isCompleting || !canFinalize}
                width={measure.x330}
              />
              {!canFinalize && (
                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                  * Documento, foto e assinatura são obrigatórios
                </Text>
              )}
            </Box>
          </Box>
        </Box>

        {/* Modal de Assinatura */}
        <Modal
          title="Assinatura"
          isVisible={showSignature}
          onClose={() => setShowSignature(false)}
        >
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
