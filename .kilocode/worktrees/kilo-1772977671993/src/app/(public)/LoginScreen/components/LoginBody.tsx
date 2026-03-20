import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { Box, Button, FormTextInputLogin, Text, TextButton } from '@/components';
import { formLoginSchema, FormLoginSchema } from '@/formValidate/formLoginSchema';
import { goForgotPasswordScreen } from '@/routes/routesService';
import { useTenantService } from '@/services';
import { UserCredentials } from '@/services/userAuthInfo/UserAuthInfoType';
import { measure } from '@/theme';


import { useLoginController } from '../hooks/useLoginController';

import { MultipleAccounts } from './MultipleAccounts';
import { UserCard } from './UserCard';

interface Props {
    controller: ReturnType<typeof useLoginController>;
}

export function LoginBody({ controller }: Props) {
    const { tenantInfo } = useTenantService();
    const [showTenantInput, setShowTenantInput] = useState(false);

    const {
        control,
        formState,
        handleSubmit,
        reset,
        setValue,
    } = useForm<FormLoginSchema>({
        mode: 'onChange',
        resolver: zodResolver(formLoginSchema),
        defaultValues: {
            tenantCode: tenantInfo?.tenantCode || '',
            email: 'motorista@transportadoraexpress.com',
            password: '12345678'
        },
    });

    const {
        showMultipleAccounts,
        isEmailField,
        userCredentialsCurrent,
        messageError,
        setMessageError,
        userCredentialsList,
        removeUserCredentials,
        saveUserCredentials,
        setShowMultipleAccounts,
        setIsEmailField,
        handleSubmitForm,
    } = controller;

    // Determina se deve mostrar o input ou o card da empresa
    const hasSavedTenant = tenantInfo && !showTenantInput;

    function handleSelectAccount(selectedUser: UserCredentials) {
        saveUserCredentials(selectedUser);
        setShowMultipleAccounts(false);
        reset({ password: '' });
        setMessageError('');
    }

    function handleNewUsername() {
        setIsEmailField(true);
        setShowMultipleAccounts(false);
        reset({ tenantCode: tenantInfo?.tenantCode || '', email: '', password: '' });
    }

    function handleChangeTenant() {
        setShowTenantInput(true);
    }

    useEffect(() => {
        if (!userCredentialsList || userCredentialsList.length === 0) {
            setShowMultipleAccounts(false);
            setIsEmailField(true);
            reset({ tenantCode: tenantInfo?.tenantCode || '', email: '', password: '' });
        }
    }, [reset, setIsEmailField, setShowMultipleAccounts, userCredentialsList, tenantInfo]);

    useEffect(() => {
        if (userCredentialsCurrent?.username && !isEmailField) {
            setValue('email', userCredentialsCurrent.username, { shouldValidate: true });
        }
    }, [userCredentialsCurrent, isEmailField, setValue]);

    // Preenche o tenantCode quando carregar do storage
    useEffect(() => {
        if (tenantInfo?.tenantCode) {
            setValue('tenantCode', tenantInfo.tenantCode, { shouldValidate: true });
        }
    }, [tenantInfo, setValue]);

    return (
        <Box alignItems="center">
            <Box alignSelf='flex-start' mb='b20'>
                <Text preset="text22" fontWeightPreset='semibold' color="black">Acesse sua conta</Text>
            </Box>
            {showMultipleAccounts ? (
                <MultipleAccounts
                    list={userCredentialsList ?? []}
                    selectUser={handleSelectAccount}
                    removeUser={removeUserCredentials}
                    onNewAccount={handleNewUsername}
                />
            ) : (
                <>
                    {/* Tenant: mostra card da empresa ou input */}
                    {hasSavedTenant ? (
                        <Box
                            alignSelf="flex-start"
                            mb="b10"
                            flexDirection="row"
                            alignItems="flex-end"
                            justifyContent="space-between"
                            width={"100%"}
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
                        <FormTextInputLogin
                            title='Empresa'
                            control={control}
                            name="tenantCode"
                            iconName="checkRound"
                            placeholder="Código da empresa"
                            autoCapitalize="none"
                            style={{ marginBottom: measure.b16 }}
                        />
                    )}

                    {isEmailField || !userCredentialsCurrent ? (
                        <FormTextInputLogin
                            title='E-mail'
                            control={control}
                            name="email"
                            iconName="iconUser"
                            placeholder="Digite seu e-mail"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            style={{ marginBottom: measure.b16 }}
                        />
                    ) : (
                        <UserCard
                            name={userCredentialsCurrent.name ?? ""}
                            onSelectNewAccount={() => setShowMultipleAccounts(true)}
                        />
                    )}

                    <FormTextInputLogin
                        title='Senha'
                        isPassword
                        control={control}
                        name="password"
                        placeholder="Digite sua senha"
                        iconName="lock"
                        messageError={messageError}
                        style={{ marginBottom: measure.b16 }}
                        autoCapitalize="none"
                        onFocus={() => setMessageError('')}
                    />
                    <TextButton
                        fontSize={measure.m14}
                        alignSelf='flex-start'
                        preset="textPrimaryUnderline"
                        title="Esqueceu sua senha?"
                        onPress={goForgotPasswordScreen}
                    />
                    <Button
                        preset="main"
                        title="Acessar"
                        mt='t16'
                        marginBottom="b16"
                        height={measure.y44}
                        onPress={handleSubmit(handleSubmitForm)}
                        disabled={!formState.isValid}
                    />


                </>
            )}
        </Box>
    );
}
