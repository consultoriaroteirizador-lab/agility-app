import { useState } from 'react';

import { useRouter, Href } from 'expo-router';

import { isBiometricPendingNextLogin } from '@/app/(public)/LoginScreen/_utils/accountBiometrics';
import { Box, Text, TouchableOpacityBox, Button, Image, BiometricToggle } from '@/components';
import Modal from '@/components/Modal/Modal';
import ProfilePhotoPicker from '@/components/ProfilePhotoPicker';
import { useAuthCredentialsService } from '@/services';
import { measure } from '@/theme';

import { BiometricPasswordPrompt } from './_components/BiometricPasswordPrompt';
import { useBiometricActivation } from './_hooks/useBiometricActivation';

interface MenuItem {
  label: string;
  href: string;
  icon: any; // require() para ícones locais
}

export default function MenuScreen() {
  const router = useRouter();
  const { userAuth, removeCredentials } = useAuthCredentialsService();
  const [popupSair, setPopupSair] = useState(false);

  const userName = userAuth?.fullname || userAuth?.nickname || 'Usuário';

  const itens: MenuItem[] = [
    {
      label: 'Histórico de rotas',
      href: '/(auth)/(tabs)/menu/historico',
      icon: require('@/assets/images/agility/menu/simbulo-hist-rotas-menu.png'),
    },
    {
      label: 'Minha equipe',
      href: '/(auth)/(tabs)/menu/equipe',
      icon: require('@/assets/images/agility/menu/simbulo-hist-rotas-menu.png'), // Reutilizando ícone: sem asset dedicado de equipe/pessoas em menu/
    },
    {
      label: 'Notificações',
      href: '/(auth)/(tabs)/notificacoes',
      icon: require('@/assets/images/agility/menu/simbulo-notificacoes-menu.png'),
    },
    {
      label: 'Ganhos',
      href: '/(auth)/(tabs)/menu/ganhos',
      icon: require('@/assets/images/agility/menu/simbulo-ganhos-menu.png'),
    },
    {
      label: 'Carteira',
      href: '/(auth)/(tabs)/menu/carteira',
      icon: require('@/assets/images/agility/menu/simbulo-ganhos-menu.png'),
    },
    {
      label: 'Avaliações',
      href: '/(auth)/(tabs)/menu/avaliacoes',
      icon: require('@/assets/images/agility/menu/simbulo-hist-rotas-menu.png'),
    },
    {
      label: 'Suporte',
      href: '/(auth)/(tabs)/menu/suporte',
      icon: require('@/assets/images/agility/menu/simbulo-suporte-menu.png'),
    },
    {
      label: 'Histórico de Protocolos',
      href: '/(auth)/(tabs)/menu/protocolos',
      icon: require('@/assets/images/agility/menu/simbulo-hist-rotas-menu.png'), // Reutilizando ícone por enquanto
    },
    {
      label: 'Jornada de trabalho',
      href: '/(auth)/(tabs)/menu/jornada',
      icon: require('@/assets/images/agility/menu/simbulo-tempo-menu.png'),
    },
    // {
    //   label: 'Termos de uso',
    //   href: '/(auth)/menu/termos',
    //   icon: require('@/assets/images/agility/menu/simbulo-termos-menu.png'),
    // },
    // {
    //   label: 'Política de privacidade',
    //   href: '/(auth)/menu/privacidade',
    //   icon: require('@/assets/images/agility/menu/simbulo-politicas-menu.png'),
    // },
  ];

  function handleNavigate(href: string) {
    router.push(href as Href);
  }

  function confirmarSaida() {
    removeCredentials();
    // router.replace será chamado automaticamente pelo removeCredentials
  }
  const { userCredentialsCurrent } = useAuthCredentialsService();
  // Ligar a digital sem a senha em mãos (o caso de quem reabriu o app) abre um
  // pedido de confirmação em vez de gravar só a preferência — ver o hook.
  const biometrics = useBiometricActivation();



  return (
    <Box scrollable flex={1} backgroundColor="white" px="x16" pt="y12" pb="y24">
      {/* Header */}
      <Box alignItems='center' marginVertical='y14'>
        <Text preset="text20" fontWeightPreset='bold' color="colorTextPrimary">
          Menu
        </Text>
      </Box>

      {/* Card Perfil */}
      <TouchableOpacityBox
        backgroundColor="white"
        borderRadius="s16"
        p="y16"
        borderWidth={measure.m1}
        borderColor="gray200"
        flexDirection="row"
        alignItems="center"
        mb="y32"
        onPress={() => handleNavigate('/(auth)/(tabs)/menu/perfil')}
      >
        {/* <ProfilePhotoPicker size={52} editable={false} initialUri={userAuth?.photo} /> */}
        <ProfilePhotoPicker size={52} editable={false} />

        <Box flex={1} marginLeft="x12">
          <Text preset="text15" color="colorTextPrimary" fontWeight="400">
            {userName}
          </Text>
          <TouchableOpacityBox onPress={() => handleNavigate('/(auth)/(tabs)/menu/perfil')} mt="y2">
            <Text preset="text13" color="primary100">
              Editar perfil
            </Text>
          </TouchableOpacityBox>
        </Box>

        <Image
          source={require('@/assets/images/agility/menu/seta-card.png')}
          width={measure.x18}
          height={measure.y18}
          resizeMode="contain"
        />
      </TouchableOpacityBox>

      {/* Lista de Opções */}
      <Box mb="y40">
        {itens.map((item, index) => (
          <TouchableOpacityBox
            key={index}
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            py="y12"
            onPress={() => handleNavigate(item.href)}
          >
            <Box flexDirection="row" alignItems="center" gap="x12">
              <Image
                source={item.icon}
                width={measure.x24}
                height={measure.y24}
                resizeMode="contain"
              />
              <Text preset="text15" color="colorTextPrimary">
                {item.label}
              </Text>
            </Box>

            <Image
              source={require('@/assets/images/agility/menu/seta-card.png')}
              width={measure.x18}
              height={measure.y18}
              resizeMode="contain"
            />
          </TouchableOpacityBox>
        ))}
      </Box>

      {/* Botão Sair */}
      <TouchableOpacityBox onPress={() => setPopupSair(true)} mb="y40">
        <Text preset="text15" color="redError">
          Sair
        </Text>
      </TouchableOpacityBox>


      {/* Versão */}
      <Text preset="text12" color="gray400">
        Versão 1.0.0
      </Text>

      <Box mb="y24">
        <BiometricToggle
          isEnabled={userCredentialsCurrent?.allowsBiometrics ?? false}
          isLoading={biometrics.isSaving}
          disabled={!userCredentialsCurrent}
          onToggle={biometrics.toggle}
          // Continua valendo para quem JÁ tem `allowsBiometrics: true` gravado sem
          // senha (instalações anteriores ao pedido de confirmação): a digital
          // volta sozinha no próximo login digitado, e a tela diz isso.
          pendingNextLogin={isBiometricPendingNextLogin(userCredentialsCurrent)}
        />
      </Box>

      <BiometricPasswordPrompt
        visible={biometrics.isPrompting}
        password={biometrics.password}
        setPassword={biometrics.setPassword}
        errorMessage={biometrics.errorMessage}
        isLoading={biometrics.isSaving}
        onConfirm={biometrics.confirmPassword}
        onCancel={biometrics.cancelPrompt}
      />

      {/* Modal de Confirmação de Saída */}
      {popupSair && (
        <Modal isVisible={popupSair} onClose={() => setPopupSair(false)} title="Deseja realmente sair?">
          <Box backgroundColor="white" borderRadius="s16" p="y24" alignItems='center' justifyContent='center'>
            <Text preset="text18" fontWeightPreset='bold' color="colorTextPrimary" mb="y8">
              Deseja realmente sair?
            </Text>


            <Box mt='t20' flexDirection="row" gap="x16" alignItems='center' justifyContent='center'>
              <Button
                title="Cancelar"
                preset="outline"
                onPress={() => setPopupSair(false)}
                width={measure.x150}
              />
              <Button
                title="Sair"
                preset="main"
                onPress={confirmarSaida}
                backgroundColor="redError"
                width={measure.x150}
              />
            </Box>
          </Box>
        </Modal>
      )}
    </Box>
  );
}
