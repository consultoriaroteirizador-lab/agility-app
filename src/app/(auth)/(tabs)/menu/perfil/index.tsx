import React, { useEffect, useState } from 'react';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  Box,
  Text,
  Button,
  Input,
  ScreenBase,
  ActivityIndicator,
} from '@/components';
import { ButtonBack } from '@/components/Button/ButtonBack';
import type { UpdateCollaboratorRequest } from '@/domain/agility/collaborator/dto';
import { useGetProfile, useUpdateProfile } from '@/domain/agility/collaborator/useCase';
import { KEY_COLLABORATORS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { useToastService } from '@/services/Toast/useToast';

interface FormData {
  fullname: string;
  nickname: string;
  phone: string;
  email: string;
  document: string;
}

export default function PerfilScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { userAuth, saveUserAuth } = useAuthCredentialsService();
  const { profile, isLoading: isLoadingProfile } = useGetProfile();

  const { showToast } = useToastService();

  const { updateProfile, isLoading: isUpdating } = useUpdateProfile({
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: [KEY_COLLABORATORS, 'profile'] });
      // Atualizar userAuth com os novos dados
      if (response?.result && userAuth) {
        saveUserAuth({
          ...userAuth,
          fullname: `${response.result.firstName || ''} ${response.result.lastName || ''}`.trim(),
          nickname: response.result.nickname || '',
          phone: response.result.phone || '',
        });
      }
      showToast({ message: "Perfil atualizado com sucesso", type: 'success', position: 'center' })
    }
  });

  const [formData, setFormData] = useState<FormData>({
    fullname: '',
    nickname: '',
    phone: '',
    email: '',
    document: '',
  });

  // Populate form with profile data from API (complete data)
  useEffect(() => {
    if (profile) {
      setFormData({
        fullname: profile.fullName || userAuth?.fullname || '',
        nickname: profile.nickname || '',
        phone: profile.phone || '',
        email: profile.email || userAuth?.email || '',
        document: profile.taxNumber || '',
      });
    } else if (!isLoadingProfile && userAuth) {
      // Fallback: use JWT data if profile fetch fails
      setFormData({
        fullname: userAuth.fullname || '',
        nickname: userAuth.nickname || '',
        phone: userAuth.phone || '',
        email: userAuth.email || '',
        document: userAuth.taxNumber || '',
      });
    }
  }, [profile, isLoadingProfile, userAuth]);

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validações básicas
    if (!formData.fullname.trim()) {
      showToast({ message: 'Nome é obrigatório', type: 'error' });
      return;
    }

    if (!formData.email.trim()) {
      showToast({ message: 'E-mail é obrigatório', type: 'error' });
      return;
    }

    const names = formData.fullname.trim().split(' ');
    const firstName = names[0] || '';
    const lastName = names.slice(1).join(' ') || '';

    const payload: UpdateCollaboratorRequest = {
      firstName,
      lastName,
      nickname: formData.nickname || undefined,
      phone: formData.phone.replace(/\D/g, '') || undefined,
    };

    updateProfile(payload);
  };

  const formatPhone = (text: string) => {
    // Remove tudo que não é dígito
    const cleaned = text.replace(/\D/g, '');

    // Formata: (XX) XXXXX-XXXX
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }

    // Formata: (XX) XXXX-XXXX
    const matchOld = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
    if (matchOld) {
      return `(${matchOld[1]}) ${matchOld[2]}-${matchOld[3]}`;
    }

    return text;
  };

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhone(text);
    handleInputChange('phone', formatted);
  };

  const formatDocument = (text: string) => {
    // Remove tudo que não é dígito
    const cleaned = text.replace(/\D/g, '');

    // CPF: XXX.XXX.XXX-XX
    if (cleaned.length <= 11) {
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
      if (match) {
        return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
      }
    }

    return cleaned;
  };

  const handleDocumentChange = (text: string) => {
    const formatted = formatDocument(text);
    handleInputChange('document', formatted);
  };

  if (isLoadingProfile) {
    return (
      <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen" fontWeight="bold" color="colorTextPrimary">
        Editar Perfil
      </Text>}>
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator size="large" />
        </Box>
      </ScreenBase>
    );
  }

  return (
    <ScreenBase buttonLeft={<ButtonBack />} title={<Text preset="textTitleScreen" fontWeight="bold" color="colorTextPrimary">
      Editar Perfil
    </Text>}>
      <Box flex={1} scrollable>



        {/* Conteúdo do Formulário */}
        <Box mt='t14'>
          {/* Foto de Perfil */}
          {/* <Box alignItems="center" marginBottom="y32">
            <ProfilePhotoPicker size={120} editable={true} />
            <Text preset="text14" color="secondaryTextColor" marginTop="y12">
              Toque para alterar a foto
            </Text>
          </Box> */}

          {/* Campos do Formulário */}
          <Box gap="y16">
            {/* Nome Completo */}
            <Input
              title="Nome Completo"
              placeholder="Digite seu nome completo"
              value={formData.fullname}
              onChangeText={(text) => handleInputChange('fullname', text)}
              editable={!isUpdating}
            />

            {/* Apelido */}
            <Input
              title="Apelido"
              placeholder="Como gostaria de ser chamado"
              value={formData.nickname}
              onChangeText={(text) => handleInputChange('nickname', text)}
              editable={!isUpdating}
            />

            {/* Telefone */}
            <Input
              title="Telefone"
              placeholder="(00) 00000-0000"
              value={formData.phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              editable={!isUpdating}
              maxLength={15}
            />

            {/* E-mail */}
            <Input
              title="E-mail"
              placeholder="seu@email.com"
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={false} // Email não pode ser alterado
            />

            {/* CPF/CNPJ */}
            <Input
              title="CPF/CNPJ"
              placeholder="000.000.000-00"
              value={formData.document}
              onChangeText={handleDocumentChange}
              keyboardType="number-pad"
              editable={false} // Documento não pode ser alterado
              maxLength={14}

            />

            {/* Botões de Ação */}
            <Box flexDirection="row" gap="x16" marginTop="y24">
              <Button
                title={isUpdating ? 'Salvando...' : 'Salvar'}
                preset="main"
                onPress={handleSave}
                disabled={isUpdating}
                flex={1}
              />
              {/* <Button
                title="Cancelar"
                preset="outline"
                onPress={handleCancel}
                disabled={isUpdating}
                flex={1}
              /> */}

            </Box>
          </Box>
        </Box>

      </Box>
    </ScreenBase>

  );
}
