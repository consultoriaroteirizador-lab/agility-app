import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ActivityIndicator, Box, Button, ScreenBase, Text, TextButton } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import { FormInput } from '@/components/Form/FormInput';
import Modal from '@/components/Modal/Modal';
import { useRecoverPassword } from "@/domain/Profile/useCase";
import { useModal } from '@/hooks/useModal';
import { goLoginScreen } from '@/routes';
import { useTenantService } from '@/services/tenantStorage';
import { measure } from '@/theme';

import {
  formForgotPasswordSchema,
  FormForgotPasswordSchema,
} from '../../../../formValidate/formForgotPasswordSchema';

export default function ForgotPasswordScreen() {
  const [modalText, setModalText] = useState("")
  const { modalIsVisible, onClose, onOpen } = useModal()
  const { tenantInfo } = useTenantService()
  const [showTenantInput, setShowTenantInput] = useState(false)

  const { isLoading, recoverPassword } = useRecoverPassword({
    onSuccess: (response) => {
      setModalText(response.message ?? "Se o cadastro existir, um link de recuperação foi enviado.")
      onOpen()
      reset()
    },
  })

  const hasSavedTenant = tenantInfo && !showTenantInput

  function handleChangeTenant() {
    setShowTenantInput(true)
  }

  const { control, formState, handleSubmit, reset, setValue } =
    useForm<FormForgotPasswordSchema>({
      mode: 'onChange',
      resolver: zodResolver(formForgotPasswordSchema),
      defaultValues: {
        tenantCode: tenantInfo?.tenantCode || '',
        email: '',
      },
    })

  // Preenche o tenantCode quando carregar do storage
  useEffect(() => {
    if (tenantInfo?.tenantCode) {
      setValue('tenantCode', tenantInfo.tenantCode, { shouldValidate: true })
    }
  }, [tenantInfo, setValue])

  function submitForm(data: FormForgotPasswordSchema) {
    recoverPassword({
      tenantCode: data.tenantCode,
      email: data.email,
    })
  }

  if (isLoading) {
    return <Box justifyContent='center' alignItems='center' flex={1}><ActivityIndicator /></Box>
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset='textTitleScreen'>Recuperar senha</Text>}>
      <Box justifyContent="space-between" paddingBottom="b12" flex={1}>
        <Box flexDirection="row" justifyContent="center" alignItems="center">
        </Box>
        <Box flex={1} justifyContent="space-between">
          <Box marginTop="t40">
            <Text
              preset="textParagraph"
              textAlign="center"
              mb="b16">
              Informe sua empresa e email para recuperar a senha!
            </Text>
            <Box
              alignItems="center"
              backgroundColor="white"
              height={'auto'}
              borderRadius="s6"
              paddingHorizontal="x10"
            >
              {/* Tenant: mostra card da empresa ou input */}
              {hasSavedTenant ? (
                <Box
                  alignSelf="flex-start"
                  mb="b10"
                  flexDirection="row"
                  alignItems="flex-end"
                  justifyContent="space-between"
                  width={"100%"}
                  mt="t20"
                  marginHorizontal="x14"
                >
                  <Box>
                    <Text preset="text14" color="gray400" mb="b4">Empresa</Text>
                    <Text preset="text16" fontWeightPreset="semibold" color="black">
                      {tenantInfo.tenantName || tenantInfo.tenantCode}
                    </Text>
                  </Box>
                  <TextButton
                    fontSize={measure.m14}
                    preset="textPrimaryUnderline"
                    title="Trocar"
                    onPress={handleChangeTenant}
                  />
                </Box>
              ) : (
                <FormInput
                  control={control}
                  name="tenantCode"
                  paddingVertical='y12'
                  placeholder="Código da empresa"
                  title="Empresa"
                  borderRadius="s4"
                  width={measure.x330}
                  autoCapitalize="none"
                  autoCorrect={false}
                  mt="t20"
                />
              )}

              <FormInput
                control={control}
                name="email"
                paddingVertical='y12'
                keyboardType="email-address"
                placeholder="Informe seu e-mail"
                title="E-mail"
                borderRadius="s4"
                width={measure.x330}
                autoCapitalize="none"
                autoCorrect={false}
                mt="t16"
              />
            </Box>
          </Box>
          <Box alignItems="center" gap="y16">
            <Button
              title="Continuar"
              onPress={handleSubmit(submitForm)}
              disabled={!formState.isValid}
            />
          </Box>
        </Box>
      </Box>
      <Modal
        title='Sucesso'
        text={modalText}
        isVisible={modalIsVisible}
        onClose={onClose}
        preset='action'
        buttonActionTitle='Fazer login'
        onPress={goLoginScreen}
      />
    </ScreenBase>
  );
}
