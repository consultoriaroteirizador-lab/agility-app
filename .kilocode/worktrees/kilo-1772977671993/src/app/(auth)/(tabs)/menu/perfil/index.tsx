import React, { useState } from 'react';
import { Alert } from 'react-native';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import {
  Box,
  Text,
  TouchableOpacityBox,
  Button,
  Input,
} from '@/components';
import ProfilePhotoPicker from '@/components/ProfilePhotoPicker';
import type { UpdateCollaboratorRequest } from '@/domain/agility/collaborator/dto';
import { useUpdateProfile } from '@/domain/agility/collaborator/useCase';
import { KEY_COLLABORATORS } from '@/domain/queryKeys';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

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
  const { userAuth } = useAuthCredentialsService();
  const { updateProfile, isLoading } = useUpdateProfile({
    onSuccess: () => {
      // Invalidar cache do profile para recarregar
      queryClient.invalidateQueries({ queryKey: [KEY_COLLABORATORS, 'profile'] });
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Erro', error?.error?.message || 'Não foi possível atualizar o perfil');
    },
  });

  const [formData, setFormData] = useState<FormData>({
    fullname: userAuth?.fullname || '',
    nickname: userAuth?.nickname || '',
    phone: '',
    email: userAuth?.email || '',
    document: userAuth?.taxNumber || '',
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    // Validações básicas
    if (!formData.fullname.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }

    if (!formData.email.trim()) {
      Alert.alert('Erro', 'E-mail é obrigatório');
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

  const handleCancel = () => {
    router.back();
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

  return (
    <Box flex={1} backgroundColor="backgroundColor">
      {/* Header */}
      <Box backgroundColor="white" paddingHorizontal="x16" paddingTop="y12" paddingBottom="y16" marginBottom="y16">
        <Box flexDirection="row" alignItems="center" justifyContent="center" width="100%">
          <TouchableOpacityBox onPress={() => router.back()} marginRight="x12">
            <Text preset="text18" color="primary100">
              ←
            </Text>
          </TouchableOpacityBox>
          <Box flex={1}>
            <Text preset="text20" fontWeight="bold" color="colorTextPrimary">
              Editar Perfil
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Conteúdo do Formulário */}
      <Box paddingHorizontal="x16">
        {/* Foto de Perfil */}
        <Box alignItems="center" marginBottom="y32">
          <ProfilePhotoPicker size={120} editable={true} />
          <Text preset="text14" color="secondaryTextColor" marginTop="y12">
            Toque para alterar a foto
          </Text>
        </Box>

        {/* Campos do Formulário */}
        <Box gap="y16">
          {/* Nome Completo */}
          <Input
            title="Nome Completo"
            placeholder="Digite seu nome completo"
            value={formData.fullname}
            onChangeText={(text) => handleInputChange('fullname', text)}
            editable={!isLoading}
          />

          {/* Apelido */}
          <Input
            title="Apelido"
            placeholder="Como gostaria de ser chamado"
            value={formData.nickname}
            onChangeText={(text) => handleInputChange('nickname', text)}
            editable={!isLoading}
          />

          {/* Telefone */}
          <Input
            title="Telefone"
            placeholder="(00) 00000-0000"
            value={formData.phone}
            onChangeText={handlePhoneChange}
            keyboardType="phone-pad"
            editable={!isLoading}
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
              title="Cancelar"
              preset="outline"
              onPress={handleCancel}
              disabled={isLoading}
              flex={1}
            />
            <Button
              title={isLoading ? 'Salvando...' : 'Salvar'}
              preset="main"
              onPress={handleSave}
              disabled={isLoading}
              flex={1}
            />
          </Box>
        </Box>
      </Box>

      {/* Espaço extra */}
      <Box height={measure.y32} />
    </Box>
  );
}