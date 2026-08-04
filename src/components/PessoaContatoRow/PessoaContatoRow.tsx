import { Linking } from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { Icon } from '@/components/Icon/Icon';
import { toTelHref, toWhatsAppHrefs } from '@/functions/phoneContact';
import { useAppTheme } from '@/hooks';
import { measure } from '@/theme';

interface PessoaContatoRowProps {
    nome: string;
    telefone: string | null;
    /** Etiqueta curta abaixo do nome — ex.: "Lider", "Ajudante". */
    etiqueta?: string;
}

/**
 * Uma pessoa numa lista, com os contatos que ela permite.
 *
 * Sem telefone a linha continua existindo, so sem os botoes: esconder a pessoa
 * por falta de cadastro faria o motorista achar que a equipe esta incompleta.
 */
export function PessoaContatoRow({ nome, telefone, etiqueta }: PessoaContatoRowProps) {
    const tel = toTelHref(telefone);
    const zap = toWhatsAppHrefs(telefone);
    // `Icon` (o componente do projeto) envolve MaterialIcons, que NAO tem glifo
    // de marca — WhatsApp so existe em Ionicons. Por isso o telefone usa o
    // componente e o WhatsApp vem direto de @expo/vector-icons, como outras
    // telas deste app ja fazem. `colors` existe so por causa disso: o Ionicons
    // recebe a cor crua, enquanto o `Icon` resolve pelo tema sozinho.
    const { colors } = useAppTheme();

    async function abrirWhatsApp() {
        if (!zap) return;
        // O esquema whatsapp:// so abre com o app instalado. Sem esta checagem,
        // o toque nao faz nada em quem nao tem WhatsApp.
        const temApp = await Linking.canOpenURL(zap.app).catch(() => false);
        // openURL rejeita quando nao ha handler pro esquema (ex.: sem app de
        // WhatsApp nem navegador capaz de abrir o link web) — sem o catch vira
        // unhandled rejection.
        Linking.openURL(temApp ? zap.app : zap.web).catch(() => {});
    }

    return (
        <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            paddingVertical="y12"
            borderBottomWidth={measure.m1}
            borderBottomColor="gray200"
        >
            <Box flex={1} paddingRight="x12">
                <Text preset="text15" color="colorTextPrimary">
                    {nome}
                </Text>
                {!!etiqueta && (
                    <Text preset="text12" color="gray400" mt="y2">
                        {etiqueta}
                    </Text>
                )}
            </Box>

            {(tel || zap) && (
                <Box flexDirection="row" gap="x16" alignItems="center">
                    {!!tel && (
                        <TouchableOpacityBox
                            onPress={() => Linking.openURL(tel).catch(() => {})}
                            accessibilityRole="button"
                            // O rotulo sai da tela, nao da acessibilidade: sem
                            // isto o leitor anunciaria dois botoes sem nome.
                            accessibilityLabel={`Ligar para ${nome}`}
                            // O icone e menor que o texto que substituiu; o
                            // hitSlop maior mantem o alvo perto de 44pt, que e o
                            // dedo de quem esta num caminhao andando.
                            hitSlop={measure.x12}
                        >
                            <Icon name="call" size={measure.m24} color="primary100" />
                        </TouchableOpacityBox>
                    )}
                    {!!zap && (
                        <TouchableOpacityBox
                            onPress={abrirWhatsApp}
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir WhatsApp de ${nome}`}
                            hitSlop={measure.x12}
                        >
                            <Ionicons
                                name="logo-whatsapp"
                                size={measure.m24}
                                color={colors.primary100}
                            />
                        </TouchableOpacityBox>
                    )}
                </Box>
            )}
        </Box>
    );
}
