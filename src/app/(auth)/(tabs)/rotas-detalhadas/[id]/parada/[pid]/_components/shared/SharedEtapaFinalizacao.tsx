import { useCallback } from 'react';
import { TextInput, Alert } from 'react-native';

import { Box, Button, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Modal from '@/components/Modal/Modal';
import { SignatureCanvas } from '@/components/SignatureCanvas';
import { PaymentMethodType } from '@/domain/agility/service/dto/types';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';
import { formatCurrency } from '@/utils/formatCurrency';
import { parseBRLToCents } from '@/utils/parseCurrency';

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

const PAYMENT_METHODS = [
  { type: PaymentMethodType.CASH, label: 'Dinheiro' },
  { type: PaymentMethodType.PIX, label: 'PIX' },
  { type: PaymentMethodType.CARD_DEBIT, label: 'Débito' },
  { type: PaymentMethodType.CARD_CREDIT, label: 'Crédito' },
] as const;

/**
 * Formats a numeric string as Brazilian currency while typing
 * @param text - Raw input text
 * @returns Formatted string in "R$ X,XX" format
 */
function formatCurrencyInput(text: string): string {
  // Remove tudo que não é dígito
  const digits = text.replace(/\D/g, '');

  if (digits.length === 0) {
    return '';
  }

  // Converte para centavos
  const cents = parseInt(digits, 10);

  // Formata como reais
  const reais = cents / 100;

  return `R$ ${reais.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

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
    service,
    showPaymentModal,
    setShowPaymentModal,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,
  } = useParada();

  console.log('[SharedEtapaFinalizacao] useParada()', {
    checklist,
    showSignature,
    requiresPayment: service?.requiresPayment,
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

    // Se o serviço requer pagamento e ainda não foi preenchido, mostrar modal
    if (service?.requiresPayment && !paymentAmount) {
      setShowPaymentModal(true);
      return;
    }

    // Importante: handleFinalizar é async, então capturamos erros aqui
    handleFinalizar().catch((error) => {
      console.error('[SharedEtapaFinalizacao] Erro não tratado:', error);
    });
  }, [handleFinalizar, serviceType, service?.requiresPayment, paymentAmount, setShowPaymentModal]);

  const handleConfirmPayment = useCallback(() => {
    const cents = parseBRLToCents(paymentAmount);

    if (cents === null || cents <= 0) {
      Alert.alert('Valor inválido', 'Digite um valor válido maior que zero.');
      return;
    }

    if (!paymentMethod) {
      Alert.alert('Método de pagamento', 'Selecione o método de pagamento.');
      return;
    }

    // Apenas registra o pagamento e fecha o modal. A finalização real
    // acontece quando o usuário toca explicitamente no botão "Finalizar"
    // — antes essa função chamava handleFinalizar() em sequência, e o
    // botão da tela já aparecia em estado "Finalizando..." sem ação do
    // usuário, parecendo bug.
    setShowPaymentModal(false);
  }, [paymentAmount, paymentMethod, setShowPaymentModal]);

  // Pagamento pendente quando o serviço exige cobrança e ainda não foi preenchido.
  const paymentPending = !!service?.requiresPayment && (!paymentAmount || !paymentMethod);

  // Inferência: se o user tem collaboratorId no JWT, é colaborador (funcionário CLT).
  // Cash recebido por colaborador vira dívida na wallet (backend cria DriverAdvance automaticamente).
  const { userAuth } = useAuthCredentialsService();
  const isCollaborator = !!userAuth?.collaboratorId;
  const showCashDebtWarning = isCollaborator && paymentMethod === PaymentMethodType.CASH;

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

            {service?.requiresPayment && (
              <Box
                marginBottom="y12"
                padding="y12"
                borderRadius="s12"
                borderWidth={measure.m1}
                borderColor="primary100"
                backgroundColor="primary10"
              >
                <Text preset="text14" fontWeightPreset="bold" color="primary100">
                  Cobrança obrigatória na entrega
                </Text>
                <Text preset="text12" color="colorTextPrimary" marginTop="t4">
                  {paymentAmount && paymentMethod
                    ? `Pagamento informado: ${paymentAmount} · ${PAYMENT_METHODS.find((m) => m.type === paymentMethod)?.label ?? ''}`
                    : 'Você precisa registrar valor e método de pagamento antes de finalizar.'}
                </Text>
                <TouchableOpacityBox
                  marginTop="t8"
                  onPress={() => setShowPaymentModal(true)}
                >
                  <Text preset="text12" color="primary100" fontWeightPreset="bold">
                    {paymentAmount && paymentMethod ? 'Editar pagamento' : 'Registrar pagamento'}
                  </Text>
                </TouchableOpacityBox>
              </Box>
            )}

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
                  <Text ml='l6' preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.documento ? 'bold' : 'regular'}>
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
                <Text ml='l6' preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.foto ? 'bold' : 'regular'}>
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
                  <Text ml='l6' preset="text16" color="colorTextPrimary" fontWeightPreset={safeChecklist.signature ? 'bold' : 'regular'}>
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
                disabled={isCompleting || !canFinalize || paymentPending}
                width={measure.x330}
              />
              {!canFinalize && (
                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                  * Documento, foto e assinatura são obrigatórios
                </Text>
              )}
              {canFinalize && paymentPending && (
                <Text preset="text12" color="primary100" textAlign="center" marginTop="y8">
                  * Registre o pagamento antes de finalizar
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

        {/* Modal de Cobrança (quando requiresPayment = true) */}
        <Modal
          title="Registrar Pagamento"
          isVisible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
        >
          <Box paddingHorizontal="x16" paddingTop="t16" paddingBottom="y16">
            <Text preset="text14" color="gray600" marginBottom="b12">
              Esta entrega requer pagamento. Informe o valor recebido do cliente.
            </Text>

            {service?.offerValue && (
              <Box marginBottom="b16">
                <Text preset="text12" color="gray400">
                  Valor esperado: {formatCurrency(service.offerValue, true)}
                </Text>
              </Box>
            )}

            <Box marginBottom="b16">
              <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b8">
                Valor recebido *
              </Text>
              <Box
                borderWidth={measure.m1}
                borderColor="borderColor"
                borderRadius="s8"
                paddingHorizontal="x12"
                paddingVertical="y8"
              >
                <TextInput
                  value={paymentAmount}
                  onChangeText={(text) => setPaymentAmount(formatCurrencyInput(text))}
                  keyboardType="numeric"
                  placeholder="R$ 0,00"
                  placeholderTextColor="#999"
                  style={{ fontSize: 16, color: '#333' }}
                />
              </Box>
            </Box>

            <Box marginBottom="b16">
              <Text preset="text14" fontWeightPreset="bold" color="colorTextPrimary" marginBottom="b8">
                Método de pagamento *
              </Text>
              <Box flexDirection="row" flexWrap="wrap" gap="y8">
                {PAYMENT_METHODS.map((method) => (
                  <TouchableOpacityBox
                    key={method.type}
                    onPress={() => setPaymentMethod(method.type)}
                    paddingHorizontal="x12"
                    paddingVertical="y8"
                    borderRadius="s8"
                    borderWidth={measure.m1}
                    borderColor={paymentMethod === method.type ? 'primary100' : 'borderColor'}
                    backgroundColor={paymentMethod === method.type ? 'primary10' : 'white'}
                  >
                    <Text
                      preset="text14"
                      color={paymentMethod === method.type ? 'primary100' : 'gray600'}
                      fontWeightPreset={paymentMethod === method.type ? 'bold' : 'regular'}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacityBox>
                ))}
              </Box>
            </Box>

            {showCashDebtWarning && (
              <Box
                marginBottom="b12"
                padding="y10"
                borderRadius="s8"
                borderWidth={measure.m1}
                borderColor="redError"
                backgroundColor="redError"
              >
                <Text preset="text12" color="white" fontWeightPreset="bold">
                  Atenção: dinheiro em mão
                </Text>
                <Text preset="text12" color="white" marginTop="t4">
                  Esse valor é da empresa. Vai aparecer como dívida na sua carteira até você devolver ao escritório.
                </Text>
              </Box>
            )}

            <Button
              title="Confirmar Pagamento"
              onPress={handleConfirmPayment}
              disabled={!paymentAmount || !paymentMethod}
            />
          </Box>
        </Modal>
      </Box>
    </ScreenBase>
  );
}
