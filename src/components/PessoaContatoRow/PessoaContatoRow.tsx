import { Linking } from 'react-native';

import { Box, Text, TouchableOpacityBox } from '@/components';
import { toTelHref, toWhatsAppHrefs } from '@/functions/phoneContact';
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

    async function abrirWhatsApp() {
        if (!zap) return;
        // O esquema whatsapp:// so abre com o app instalado. Sem esta checagem,
        // o toque nao faz nada em quem nao tem WhatsApp.
        const temApp = await Linking.canOpenURL(zap.app).catch(() => false);
        Linking.openURL(temApp ? zap.app : zap.web);
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
                            onPress={() => Linking.openURL(tel)}
                            accessibilityLabel={`Ligar para ${nome}`}
                            hitSlop={measure.x8}
                        >
                            <Text preset="text13" color="primary100">
                                Ligar
                            </Text>
                        </TouchableOpacityBox>
                    )}
                    {!!zap && (
                        <TouchableOpacityBox
                            onPress={abrirWhatsApp}
                            accessibilityLabel={`Abrir WhatsApp de ${nome}`}
                            hitSlop={measure.x8}
                        >
                            <Text preset="text13" color="primary100">
                                WhatsApp
                            </Text>
                        </TouchableOpacityBox>
                    )}
                </Box>
            )}
        </Box>
    );
}
