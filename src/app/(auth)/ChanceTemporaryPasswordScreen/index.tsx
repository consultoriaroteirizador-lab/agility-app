
import { useContext } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';


import { BaseResponse } from '@/api';
import {
    ActivityIndicator,
    Box,
    Button,
    PasswordValidateUI,
    ScreenBase,
    Text,
} from '@/components';
import { FormInput } from '@/components/Form/FormInput';
import { authService } from '@/domain/Auth/authService';
import { useAuthSignIn } from '@/domain/Auth/useCases/useAuthSignIn';
import { useChangePassword } from '@/domain/Profile/useCase/useChangePassword';
import { formChangePasswordSchema, FormChangePasswordSchema } from '@/formValidate';
import { useNavigationNotActionOnBack } from '@/hooks';
import { goHomeScreen, goRegisterAllowsBiometricScreen } from '@/routes';
import { DefaultAccessUserContext, useAuthCredentialsService, useTenantService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';


export default function ChanceTemporaryPasswordScreen() {
    useNavigationNotActionOnBack();

    const { userCredentialsCurrent, saveUserCredentials, isLoading: IsLoadingUserCredentials } = useAuthCredentialsService()
    const { isLoading: isLoadingAccessUser } = useContext(DefaultAccessUserContext)
    const { tenantInfo } = useTenantService();

    const { showToast } = useToastService()

    const { signIn, isLoading: isLoadingSignIn } = useAuthSignIn({
        onError: (error) => {
            showToast({ message: error.error?.message ?? "Erro ao fazer login após alterar senha", position: 'center', type: 'error' });
        },
        onSuccess: async () => {
            await saveUserCredentials({
                ...userCredentialsCurrent!,
                password: passwordValue
            });
            if (userCredentialsCurrent!.allowsBiometrics) {
                goHomeScreen()
            } else {
                goRegisterAllowsBiometricScreen()
            }
        },
    });

    const { isLoading, changePassword } = useChangePassword({
        onSuccess: async (response: BaseResponse<string>) => {
            showToast({ message: response.message ?? "Senha alterada com sucesso", position: 'center', type: 'success' })
            // Remover token antigo antes de fazer novo login para evitar que requisições usem token inválido
            // Usar authService.removeToken() diretamente para não redirecionar para login
            authService.removeToken();
            // Fazer novo login para obter token atualizado com status ACTIVE
            if (userCredentialsCurrent?.username) {
                signIn({
                    emailOrUsername: userCredentialsCurrent.username,
                    password: passwordValue,
                    tenantCode: tenantInfo?.tenantCode
                });
            }
        },
    })

    function onSubmit({ password, newPassword, newPasswordConfirmation }: FormChangePasswordSchema) {
        changePassword({
            password,
            newPassword,
            newPasswordConfirmation
        })
    }

    const { formState, handleSubmit, control, watch } =
        useForm<FormChangePasswordSchema>({
            mode: 'onChange',
            resolver: zodResolver(formChangePasswordSchema),

        });

    const passwordValue = watch('newPassword');

    if (isLoading || isLoadingSignIn || IsLoadingUserCredentials || isLoadingAccessUser) {
        return <Box justifyContent='center' alignItems='center' flex={1}><ActivityIndicator /></Box>
    }

    return (
        <ScreenBase title={<Text preset="textTitleScreen">
            Alterar senha temporária
        </Text>}>
            <Box justifyContent="space-between" paddingBottom="b12" flex={1} mt='t40'>
                <Box alignItems="center">
                    <FormInput
                        borderType='bottom'
                        control={control}
                        name="password"
                        placeholder="Informe sua nova senha"
                        title="Senha temporária"
                        maxLength={16}
                        autoCapitalize="none"
                    />
                    <Box marginVertical='y20'>

                        <FormInput
                            keyboardType='default'
                            borderType='bottom'
                            control={control}
                            name="newPassword"
                            placeholder="Informe sua nova senha"
                            title="Nova Senha"
                            maxLength={16}
                            autoCapitalize="none"
                        />
                        <PasswordValidateUI
                            password={passwordValue ?? ''}
                            alignSelf="flex-start"
                            mt="t10"
                            mb="b16"
                        />
                    </Box>

                    <FormInput
                        borderType='bottom'
                        control={control}
                        name="newPasswordConfirmation"
                        placeholder="Confirme sua nova senha"
                        title="Confirmar senha"
                        maxLength={16}
                        autoCapitalize="none"
                        contextMenuHidden
                    />
                </Box>
                <Box alignItems="center" gap="y16">
                    <Button
                        title="Alterar Senha"
                        onPress={handleSubmit(onSubmit)}
                        disabled={!formState.isValid}
                    />

                </Box>
            </Box>
        </ScreenBase>
    );
}
