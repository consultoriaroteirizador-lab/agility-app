import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform } from 'react-native';

import { mensagemDaApi } from '@/api/apiErrorMessage';
import { Box, Button, Input, ScreenBase, Text, TouchableOpacityBox } from '@/components';
import { Toast } from '@/components/Toast/Toast';
import type { EquipmentLookupResponse, ServiceLine } from '@/domain/agility/service/dto/response/service-line.response';
import {
    lookupFoundFor,
    SWAP_DESCRIPTION_REQUIRED,
    swapFormErrors,
    swappableLines,
    swapRequestBody,
    type SwapForm,
} from '@/domain/agility/service/serviceLines';
import { serviceService } from '@/domain/agility/service/serviceService';
import { useSwapLine } from '@/domain/agility/service/useCase/useSwapLine';
import { useAppSafeArea } from '@/hooks/useAppSafeArea';
import { useSubmitLock } from '@/hooks/useSubmitLock';
import { useToastService } from '@/services/Toast/useToast';
import { measure } from '@/theme';

export const SWAP_SUCCESS_MESSAGE = 'Troca registrada';
export const SWAP_FALLBACK_MESSAGE = 'Não foi possível registrar a troca. Tente de novo.';

const FORM_VAZIO: SwapForm = { code: '', serialNumber: '', description: '', reason: '' };

type TrocarEquipamentoModalProps = {
    visible: boolean;
    serviceId: string;
    lines: readonly ServiceLine[];
    onClose: () => void;
};

/**
 * Troca de equipamento na parada (fase 3D). Passo 1: qual equipamento sai (pulado com uma só trocável).
 * Passo 2: código, nº de série, descrição (só com o código fora do cadastro) e motivo. Ao sair do
 * Código, consulta o cadastro do dono do pedido. Sem atualização otimista: o sucesso recarrega o
 * pedido (`useSwapLine`). A trava de envio (`useSubmitLock`) segura o toque duplo.
 */
export function TrocarEquipamentoModal({ visible, serviceId, lines, onClose }: TrocarEquipamentoModalProps) {
    const { top } = useAppSafeArea();
    const { showToast } = useToastService();
    const { swapLineAsync } = useSwapLine();
    const { run, isSubmitting, isLocked } = useSubmitLock();
    const [escolhidaId, setEscolhidaId] = useState<string | null>(null);
    const [form, setForm] = useState<SwapForm>(FORM_VAZIO);
    const [lookup, setLookup] = useState<EquipmentLookupResponse | null>(null);
    const [tentou, setTentou] = useState(false);
    // O código da consulta mais recente: a resposta de uma consulta anterior que chega depois é descartada.
    const ultimaConsulta = useRef('');
    // A linha que sai é fixada na abertura (com uma só trocável) e nunca recalculada das linhas atuais.
    const fixouNaAbertura = useRef(false);

    useEffect(() => {
        if (!visible) {
            setEscolhidaId(null);
            setForm(FORM_VAZIO);
            setLookup(null);
            setTentou(false);
            ultimaConsulta.current = '';
            fixouNaAbertura.current = false;
            return;
        }
        if (fixouNaAbertura.current) return;
        fixouNaAbertura.current = true;
        const trocaveisNaAbertura = swappableLines(lines);
        if (trocaveisNaAbertura.length === 1) setEscolhidaId(trocaveisNaAbertura[0].id);
    }, [visible, lines]);

    const trocaveis = swappableLines(lines);
    const escolhida = escolhidaId === null ? null : (trocaveis.find((l) => l.id === escolhidaId) ?? null);
    // A escolhida deixou de ser trocável com o modal aberto (a troca gravou apesar de um timeout, e o
    // recarregamento chegou): fecha, e a lista da parada mostra "Trocado" e "No lugar de". Seguir aberto
    // apontaria o formulário preenchido para outra linha.
    const escolhidaSaiu = visible && escolhidaId !== null && escolhida === null;

    useEffect(() => {
        if (escolhidaSaiu) onClose();
    }, [escolhidaSaiu, onClose]);

    if (!visible || escolhidaSaiu) return null;
    const found = lookupFoundFor(form.code, lookup);
    const erros = swapFormErrors({ code: form.code, serialNumber: form.serialNumber, found, description: form.description });

    const mudar = (campo: keyof SwapForm) => (valor: string) => setForm((atual) => ({ ...atual, [campo]: valor }));

    /** O ✕ e o voltar do Android, como o "Cancelar": não fecham com a troca em voo. */
    const fechar = () => {
        if (!isLocked()) onClose();
    };

    /** Consulta o código do campo; devolve `found`, ou `null` se a consulta falhar ou ficar velha. */
    const consultar = async (): Promise<boolean | null> => {
        const code = form.code.trim();
        if (!code) return null;
        const jaConsultado = lookupFoundFor(code, lookup);
        if (jaConsultado !== null) return jaConsultado;
        ultimaConsulta.current = code;
        try {
            const resposta = await serviceService.lookupEquipment(serviceId, code);
            const resultado = resposta.result;
            if (!resultado || resultado.code !== ultimaConsulta.current) return null;
            setLookup(resultado);
            return resultado.found;
        } catch {
            // Sem a consulta, o formulário segue; o backend recusa código fora do cadastro sem descrição.
            return null;
        }
    };

    const registrar = () =>
        run(async () => {
            if (!escolhida) return;
            setTentou(true);
            const achado = found ?? (await consultar());
            const errosAgora = swapFormErrors({
                code: form.code,
                serialNumber: form.serialNumber,
                found: achado,
                description: form.description,
            });
            if (Object.keys(errosAgora).length > 0) return;
            try {
                await swapLineAsync({ serviceId, lineId: escolhida.id, data: swapRequestBody(form) });
                showToast({ message: SWAP_SUCCESS_MESSAGE, type: 'success' });
                onClose();
            } catch (error) {
                showToast({ message: mensagemDaApi(error, SWAP_FALLBACK_MESSAGE), type: 'error' });
            }
        });

    return (
        <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={fechar}>
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={top}
            >
                <Box flex={1} style={{ paddingTop: top }}>
                    <ScreenBase
                        disableKeyboardAvoid
                        mtScreenBase="t0"
                        mbScreenBase="b0"
                        scrollable
                        buttonLeft={
                            <TouchableOpacityBox onPress={fechar} padding="x8">
                                <Text preset="text20" color="gray400">✕</Text>
                            </TouchableOpacityBox>
                        }
                        title={
                            <Text preset="text18" color="primary100" fontWeightPreset="semibold">
                                Trocar equipamento
                            </Text>
                        }
                    >
                        {!escolhida ? (
                            <Box gap="y8">
                                <Text preset="text14" color="colorTextPrimary" fontWeightPreset="semibold">
                                    Qual equipamento você vai trocar?
                                </Text>
                                {trocaveis.map((opcao) => (
                                    <TouchableOpacityBox
                                        key={opcao.id}
                                        onPress={() => setEscolhidaId(opcao.id)}
                                        padding="y12"
                                        paddingHorizontal="x12"
                                        borderWidth={measure.m1}
                                        borderColor="gray200"
                                        borderRadius="s8"
                                    >
                                        <Text preset="text14" color="colorTextPrimary" fontWeightPreset="semibold">
                                            {opcao.material}
                                        </Text>
                                        {opcao.serialNumber ? (
                                            <Text preset="text12" color="gray500">{`S/N: ${opcao.serialNumber}`}</Text>
                                        ) : null}
                                    </TouchableOpacityBox>
                                ))}
                            </Box>
                        ) : (
                            <Box flex={1} gap="y12">
                                <Box backgroundColor="gray50" padding="y12" borderRadius="s12">
                                    <Text preset="text12" color="gray400">Sai</Text>
                                    <Text preset="text16" color="colorTextPrimary" fontWeightPreset="bold">
                                        {escolhida.material}
                                    </Text>
                                    {escolhida.serialNumber ? (
                                        <Text preset="text14" color="gray400">{`S/N: ${escolhida.serialNumber}`}</Text>
                                    ) : null}
                                </Box>

                                <Box>
                                    <Input
                                        title="Código *"
                                        borderType="all"
                                        value={form.code}
                                        onChangeText={mudar('code')}
                                        onBlur={() => consultar()}
                                        placeholder="Código do equipamento que fica"
                                        autoCapitalize="characters"
                                        messageError={tentou ? erros.code : undefined}
                                    />
                                    {found === true && lookup?.found ? (
                                        <Text preset="text12" color="primary100">{`✓ ${lookup.name}`}</Text>
                                    ) : null}
                                    {found === false ? (
                                        <Text preset="text12" color="redError">{SWAP_DESCRIPTION_REQUIRED}</Text>
                                    ) : null}
                                </Box>

                                <Input
                                    title="Nº de série *"
                                    borderType="all"
                                    value={form.serialNumber}
                                    onChangeText={mudar('serialNumber')}
                                    placeholder="Nº de série do equipamento que fica"
                                    autoCapitalize="characters"
                                    messageError={tentou ? erros.serialNumber : undefined}
                                />

                                {found === false ? (
                                    <Input
                                        title="Descrição *"
                                        borderType="all"
                                        value={form.description}
                                        onChangeText={mudar('description')}
                                        placeholder="Ex.: Modem Wi-Fi"
                                    />
                                ) : null}

                                <Input
                                    title="Motivo"
                                    borderType="all"
                                    value={form.reason}
                                    onChangeText={mudar('reason')}
                                    placeholder="Por que trocou (opcional)"
                                    multiline
                                    numberOfLines={3}
                                    maxLength={500}
                                />

                                <Box flexDirection="row" gap="x12" marginTop="y8">
                                    <Box flex={1}>
                                        <Button
                                            title="Registrar troca"
                                            onPress={registrar}
                                            disabled={isSubmitting}
                                            isLoading={isSubmitting}
                                            width={measure.x150}
                                        />
                                    </Box>
                                    <Box flex={1}>
                                        <Button
                                            title="Cancelar"
                                            preset="outline"
                                            onPress={onClose}
                                            disabled={isSubmitting}
                                            width={measure.x150}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        )}
                    </ScreenBase>
                </Box>
                {/* O <Toast /> da raiz fica atrás do Modal nativo: sem este, a falha da troca era muda.
                    Os dois leem o mesmo store; este só existe com o modal aberto. */}
                <Toast />
            </KeyboardAvoidingView>
        </Modal>
    );
}
