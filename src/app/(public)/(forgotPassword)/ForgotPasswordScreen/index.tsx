import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { ActivityIndicator, Box, Button, ScreenBase, Text } from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import Checkbox from '@/components/CheckboxBox/CheckboxBox';
import { FormInput } from '@/components/Form/FormInput';
import Modal from '@/components/Modal/Modal';
import { useRecoverPassword } from "@/domain/Profile/useCase";
import { extractNumbers } from '@/functions';
import { useModal } from '@/hooks/useModal';
import { goLoginScreen } from '@/routes';
import { measure } from '@/theme';

import { ContactType } from '../../../../domain/Profile/dto/ContactType';
import {
  formTaxNumberForgotPasswordSchema,
  FormTaxNumberForgotPasswordSchema,
} from '../../../../formValidate/formTaxNumberForgotPasswordSchema';


export default function ForgotPasswordScreen() {
  const [modalText, setModalText] = useState("")
  const { modalIsVisible, onClose, onOpen } = useModal()

  const { isLoading, recoverPassword } = useRecoverPassword({
    onSuccess: (response) => {
      setModalText(response.message ?? "Senha temporária enviada com sucesso")
      onOpen()
      reset()
    },
  })

  const [recuperationMethod, setRecuperationMethod] = useState<ContactType>("EMAIL");

  const recuperationMethodsOptions = [
    { method: "EMAIL" as ContactType, label: "Recuperar por E-mail" },
    { method: "PHONE" as ContactType, label: "Recuperar por Telefone" }
  ];

  const { control, formState, handleSubmit, reset } =
    useForm<FormTaxNumberForgotPasswordSchema>({
      mode: 'onChange',
      resolver: zodResolver(formTaxNumberForgotPasswordSchema),
      defaultValues: {
        taxNumber: '',
      },
    });

  function submitForm({ taxNumber }: FormTaxNumberForgotPasswordSchema) {
    // TODO: Converter CPF para email ou ajustar backend para aceitar CPF
    // Por enquanto, usando CPF como identificador temporário
    // O backend precisa aceitar CPF ou precisamos buscar o email pelo CPF
    const cpf = extractNumbers(taxNumber);
    
    // Se o backend ainda não aceita CPF diretamente, será necessário:
    // 1. Buscar o email pelo CPF em outro endpoint, ou
    // 2. Ajustar o backend para aceitar CPF no campo email
    recoverPassword({
      email: cpf, // Temporário: assumindo que backend aceita CPF como email ou fará discovery
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
              Digite seu CPF para recuperar a senha!
            </Text>
            <Box
              alignItems="center"
              backgroundColor="white"
              height={'auto'}
              borderRadius="s6"
              paddingHorizontal="x10"
            >
              <FormInput
                typeMask='cpf'
                control={control}
                name="taxNumber"
                paddingVertical='y12'
                keyboardType="numeric"
                placeholder="Informe seu CPF"
                title="CPF"
                borderRadius="s4"
                width={measure.x330}
              />
              <Box gap="y14" mt='t20' marginHorizontal='x14'>
                <Text
                  color="gray600"
                  preset="text14"
                  textAlign="left"
                  fontWeightPreset='semibold'
                >
                  Escolha como deseja receber sua senha temporária:
                </Text>
                {recuperationMethodsOptions.map(({ method, label }) => (
                  <Checkbox
                    key={method}
                    textPreset="text15"
                    alignItems="center"
                    width={measure.x20}
                    size={measure.x18}
                    title={label}
                    gap="x10"
                    isChecked={recuperationMethod === method}
                    onPress={() => setRecuperationMethod(method)}
                  />
                ))}
              </Box>
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
      <Modal title='Sucesso' text={modalText} isVisible={modalIsVisible} onClose={onClose} preset='action' buttonActionTitle='Fazer login' onPress={goLoginScreen} />
    </ScreenBase>
  );
}
