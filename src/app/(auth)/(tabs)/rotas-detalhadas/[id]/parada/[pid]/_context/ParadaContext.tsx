import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
  useRef,
} from 'react';

import * as ImagePicker from 'expo-image-picker';

import type { AddressResponse } from '@/domain/agility/address/dto';
import { useFindOneAddress } from '@/domain/agility/address/useCase';
import { useGetMe } from '@/domain/agility/driver/useCase';
import type { FormGroupResponse } from '@/domain/agility/form-group/dto/form-group.response';
import { formGroupService } from '@/domain/agility/form-group/formGroupService';
import { FormEntityType } from '@/domain/agility/form-group-answer/dto/create-form-group-answer.request';
import { useCreateFormGroupAnswer } from '@/domain/agility/form-group-answer/useCase/useCreateFormGroupAnswer';
import type { ServiceDraftData } from '@/domain/agility/service/dto';
import type { ServiceMaterialResponse, MaterialStatus } from '@/domain/agility/service/dto/response/service-material.response';
import { PaymentMethodType, ServiceStatus, ServiceType } from '@/domain/agility/service/dto/types';
import { serviceService } from '@/domain/agility/service/serviceService';
import { uploadMultipleServicePhotos, uploadBase64Signature } from '@/domain/agility/service/serviceUploadUtils';
import {
  useFindOneService,
  useFindServicesByRoutingId,
  useCheckMaterial,
  useGetServiceDraft,
  useSaveServiceDraft,
} from '@/domain/agility/service/useCase';
import {
  clearParadaDraft,
  loadParadaDraft,
  saveParadaDraft,
  type ParadaDraft,
} from '@/services/storage/paradaDraftStorage';
import { parseBRLToCents } from '@/utils/parseCurrency';

import { useStopStatus } from '../_hooks/useStopStatus';
import { resolveCompanyRules } from '../_utils/companyRules';

// Tipos
export type RecipientType = 'cliente' | 'porteiro' | 'vizinho' | 'familiar' | 'outro';

export interface RecipientData {
  tipo: RecipientType | null;
  nome: string;
  tipoDocumento: string;
  numeroDocumento: string;
}

export interface ChecklistState {
  documento: boolean;
  foto: boolean;
  signature: boolean;
}

/**
 * Snapshot da evidência da COLETA na origem (perna 1 do TRANSFER). Capturado ao
 * avançar para a entrega e enviado como `pickupCompletion` na finalização.
 */
export interface PickupEvidence {
  receivedBy?: string;
  signatureUrl?: string;
  photoUrls: string[];
  notes?: string;
}

export interface MaterialsState {
  materials: ServiceMaterialResponse[];
  loading: boolean;
  allChecked: boolean;
}

export interface FormState {
  formGroups: FormGroupResponse[];
  formAnswersMap: Record<string, string | string[]>;
  formCompleted: boolean;
  loading: boolean;
}

interface ParadaContextValue {
  // Dados do serviço
  service: ReturnType<typeof useFindOneService>['service'];
  effectiveAddress: AddressResponse | null;
  isLoading: boolean;
  serviceError: boolean;

  // IDs
  rotaId: string;
  serviceId: string;

  // Estado da etapa atual
  etapa: number;
  setEtapa: (etapa: number) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;

  // Flags de estado
  arrived: boolean;
  setArrived: (value: boolean) => void;
  delivered: boolean;
  setDelivered: (value: boolean) => void;

  // Dados do recipient
  recipient: RecipientData;
  updateRecipient: (data: Partial<RecipientData>) => void;
  resetRecipient: () => void;

  // Mídia
  photos: ImagePicker.ImagePickerAsset[];
  signature: string | null;
  addFoto: (foto: ImagePicker.ImagePickerAsset) => void;
  removeFoto: (index: number) => void;
  setPhotos: React.Dispatch<React.SetStateAction<ImagePicker.ImagePickerAsset[]>>;
  setSignature: (data: string | null) => void;

  // Estados de modais de mídia
  showSignature: boolean;
  setShowSignature: (value: boolean) => void;

  // Checklist
  checklist: ChecklistState;
  updateChecklist: (key: keyof ChecklistState, value: boolean) => void;

  // Observação
  observation: string;
  setObservation: (text: string) => void;

  // Navegação modal
  showNavigation: boolean;
  setShowNavigation: (value: boolean) => void;

  // Estado de sucesso
  showSuccess: boolean;
  setShowSuccess: (value: boolean) => void;

  // Estado de finalização
  finalizing: boolean;
  setFinalizing: (value: boolean) => void;

  // Upload progress
  uploadProgress: Map<number, { loaded: number; total: number; percentage: number }>;
  setUploadProgress: (progress: Map<number, { loaded: number; total: number; percentage: number }> | ((prev: Map<number, { loaded: number; total: number; percentage: number }>) => Map<number, { loaded: number; total: number; percentage: number }>)) => void;

  // Materials check state
  materialsState: MaterialsState;
  fetchMaterials: () => Promise<void>;
  checkMaterial: (materialId: string, data: { status: MaterialStatus; actualQuantity?: number; notes?: string; photoProof?: string }) => Promise<boolean>;
  setMaterials: (materials: ServiceMaterialResponse[]) => void;
  checkCompleted: boolean;
  completeCheck: () => void;

  // Coleta de retorno (parada com entrega + devolução no mesmo stop).
  // `hasReturn` vem do backend (flag explícito) ou é inferido de materiais direction=PICKUP.
  hasReturn: boolean;
  returnCheckCompleted: boolean;
  completeReturnCheck: () => void;

  // TRANSFER: wizard de 2 pernas (coleta na origem A → entrega no destino B).
  isTransfer: boolean;
  transferLeg: 'pickup' | 'delivery';
  setTransferLeg: (leg: 'pickup' | 'delivery') => void;
  pickupDone: boolean;
  pickupEvidence: PickupEvidence | null;
  commitPickupLeg: () => void;

  // Gating de início de parada (regras configuráveis da empresa).
  // `canStartService` = pode iniciar a parada agora; `startBlockReason` = motivo do
  // bloqueio (null quando liberado), usado no toast ao tentar iniciar bloqueado.
  canStartService: boolean;
  startBlockReason: string | null;

  // Utilitários
  isServiceStarted: boolean;
  resetState: () => void;

  // Pagamento (cobrança na entrega)
  showPaymentModal: boolean;
  setShowPaymentModal: (value: boolean) => void;
  paymentAmount: string;
  setPaymentAmount: (value: string) => void;
  paymentMethod: PaymentMethodType | null;
  setPaymentMethod: (value: PaymentMethodType | null) => void;

  // Código de confirmação de entrega (T3) — informado pelo cliente ao motorista.
  deliveryCode: string;
  setDeliveryCode: (value: string) => void;
  bypassReasonCode: string | null;
  setBypassReasonCode: (value: string | null) => void;
  bypassReasonText: string;
  setBypassReasonText: (value: string) => void;

  // Código de confirmação de retirada (T4) — informado pelo cliente ao motorista.
  // Estado separado do de entrega (deliveryCode/bypassReasonCode acima) para não
  // clobberar um checkpoint com o outro (ex.: TRANSFER passa pelos dois).
  pickupCode: string;
  setPickupCode: (value: string) => void;
  pickupBypassReasonCode: string | null;
  setPickupBypassReasonCode: (value: string | null) => void;
  pickupBypassReasonText: string;
  setPickupBypassReasonText: (value: string) => void;

  // Formulário dinâmico
  formGroups: FormGroupResponse[];
  formAnswersMap: Record<string, string | string[]>;
  formCompleted: boolean;
  hasFormGroups: boolean;
  formLoading: boolean;
  fetchFormGroups: () => Promise<void>;
  setFormAnswer: (questionId: string, value: string | string[]) => void;
  submitFormAnswers: () => Promise<void>;
}

const ParadaContext = createContext<ParadaContextValue | null>(null);

const RECIPIENT_INITIAL: RecipientData = {
  tipo: null,
  nome: '',
  tipoDocumento: 'RG',
  numeroDocumento: '',
};

const CHECKLIST_INITIAL: ChecklistState = {
  documento: false,
  foto: false,
  signature: false,
};

interface ParadaProviderProps {
  children: ReactNode;
  serviceId: string;
  rotaId: string;
}

export function ParadaProvider({ children, serviceId, rotaId }: ParadaProviderProps) {
  // Buscar dados do serviço
  const { service, isLoading, isError } = useFindOneService(serviceId);

  // TRANSFER: serviço ponto-a-ponto (origem A → destino B). O wizard tem 2 pernas.
  const isTransfer = service?.serviceType === ServiceType.TRANSFER;
  // Perna atual do TRANSFER: 'pickup' (coleta na origem) → 'delivery' (entrega no destino).
  const [transferLeg, setTransferLeg] = useState<'pickup' | 'delivery'>('pickup');
  // Coleta na origem concluída (evidência capturada). Persistido no draft.
  const [pickupDone, setPickupDone] = useState(false);
  // Snapshot da evidência da coleta na origem (perna 1) — guardado ao avançar para a
  // entrega, pois recipient/photos/signature são reaproveitados na perna 2.
  const [pickupEvidence, setPickupEvidence] = useState<PickupEvidence | null>(null);

  // Fallback de endereço (quando backend não retorna embedded)
  const embeddedAddress = service?.address ?? null;
  const shouldFetchAddress = !embeddedAddress && !!service?.addressId;
  const { address: fetchedAddress } = useFindOneAddress(
    shouldFetchAddress ? service?.addressId || null : null
  );
  // Endereço efetivo é leg-aware no TRANSFER: origem na perna de coleta, destino na
  // perna de entrega. Nos demais tipos, é o endereço único do serviço.
  const effectiveAddress = isTransfer
    ? ((transferLeg === 'pickup' ? service?.pickupAddress : service?.deliveryAddress) ?? null)
    : (embeddedAddress ?? fetchedAddress ?? null);

  // ── Gating de início de parada (regras configuráveis por empresa) ─────────
  // Backend é a fonte de verdade; aqui apenas desabilitamos os botões e
  // mostramos um toast antecipando a rejeição (UX). Lê os flags de `me`.
  // `useGetMe` (GET /drivers/me) resolve o motorista logado seja ele funcionário
  // ou terceirizado — o antigo useGetProfile (/collaborators/profile) 404ava para
  // terceirizado e apagava a regra operacional para ele.
  const { me } = useGetMe();
  // Opt-out: mesma semântica do backend. Perfil ainda não carregado (rede ruim,
  // primeiro render) NÃO pode desligar a regra — na dúvida, ela vale.
  const rules = resolveCompanyRules(me?.companyFeatures);
  const { services: routeServices } = useFindServicesByRoutingId(service?.routingId || rotaId || '');
  const stopGate = useStopStatus({
    service: service ?? null,
    allServices: routeServices,
    currentServiceId: serviceId,
    enforceSingleActiveStop: rules.enforceSingleActiveStop,
    enforceStopOrder: rules.enforceStopOrder,
  });
  const canStartService = stopGate.canStartService;
  const startBlockReason = stopGate.startBlockReason;

  // Hook para check de material
  const checkMaterialMutation = useCheckMaterial();

  // Hook para criar form group answers
  const createFormGroupAnswerMutation = useCreateFormGroupAnswer();

  // Estado da etapa
  const [etapa, setEtapa] = useState(1);
  const [delivered, setDelivered] = useState(false);

  // `arrived` é derivado do status do backend — nunca fonte de verdade local.
  // O botão "Estou aqui" chama /services/:id/start-attendance, que move o serviço
  // para IN_ATTENDANCE; o refetch propaga aqui e `arrived` vira true. O fluxo de
  // etapas (confirmação, recebedor, finalização) só abre quando EM ATENDIMENTO —
  // IN_PROGRESS é apenas "a caminho" e não deve abrir o fluxo.
  const isServiceStartedRaw = !!(service && (service.status === ServiceStatus.IN_ATTENDANCE || service.isInAttendance === true));
  const arrived = isServiceStartedRaw;
  const setArrived = useCallback((_value: boolean) => {
    if (__DEV__) {
      console.warn('[ParadaContext] setArrived is a no-op — derive from service.startDate / status instead.');
    }
  }, []);

  // Dados do recipient
  const [recipient, setRecipient] = useState<RecipientData>(RECIPIENT_INITIAL);

  // Mídia
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [signature, setSignatureState] = useState<string | null>(null);

  // Estados de modais de mídia
  const [showSignature, setShowSignature] = useState(false);

  // Materials state
  const [materialsState, setMaterialsState] = useState<MaterialsState>({
    materials: [],
    loading: false,
    allChecked: false,
  });

  // Check completed flag (itens de entrega)
  const [checkCompleted, setCheckCompleted] = useState(false);

  // Check completed flag (itens de retorno/devolução — direction=PICKUP)
  const [returnCheckCompleted, setReturnCheckCompleted] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistState>(CHECKLIST_INITIAL);

  // Observação
  const [observation, setObservation] = useState('');

  // Modais e estados de UI
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, { loaded: number; total: number; percentage: number }>>(new Map());

  // Estado de pagamento (cobrança na entrega)
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType | null>(null);

  // Estado do código de confirmação de entrega (short-lived — não persistido no draft).
  const [deliveryCode, setDeliveryCode] = useState('');
  const [bypassReasonCode, setBypassReasonCode] = useState<string | null>(null);
  const [bypassReasonText, setBypassReasonText] = useState('');

  // Estado do código de confirmação de retirada (short-lived — não persistido no draft).
  const [pickupCode, setPickupCode] = useState('');
  const [pickupBypassReasonCode, setPickupBypassReasonCode] = useState<string | null>(null);
  const [pickupBypassReasonText, setPickupBypassReasonText] = useState('');

  // Estado do formulário dinâmico
  const [formState, setFormState] = useState<FormState>({
    formGroups: [],
    formAnswersMap: {},
    formCompleted: false,
    loading: false,
  });

  // Verificar se o serviço já está iniciado (mesma fonte de verdade que `arrived`).
  const isServiceStarted = isServiceStartedRaw;

  // Função de checklist (declarada antes de ser usada)
  const updateChecklist = useCallback(
    (key: keyof ChecklistState, value: boolean) => {
      setChecklist((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Efeito para ajustar etapa baseado no status do serviço.
  // `arrived` é derivado — nada de setArrived aqui.
  useEffect(() => {
    // TRANSFER controla a navegação por perna manualmente (a chegada na origem/destino
    // é um passo de UI, não derivado do status) — não auto-avança.
    if (!isTransfer && isServiceStarted && etapa === 1) {
      setEtapa(2);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isServiceStarted]);

  // Efeito para carregar materiais que já vêm do serviço (evita chamada extra)
  useEffect(() => {
    if (service?.materials && service.materials.length > 0) {
      const materials = service.materials;
      const allChecked = materials.every(m => m.status !== 'PENDING');
      setMaterialsState({
        materials,
        loading: false,
        allChecked,
      });
    }
  }, [service?.materials]);

  // Efeito para preencher nome automaticamente quando selecionar "cliente"
  useEffect(() => {
    if (recipient.tipo === 'cliente' && service) {
      const nomeCliente = service.fantasyName || service.responsible;
      if (nomeCliente) {
        setRecipient((prev) => ({ ...prev, nome: nomeCliente }));
      }
    } else if (recipient.tipo !== 'cliente' && recipient.tipo !== null) {
      setRecipient((prev) => ({ ...prev, nome: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipient.tipo, service]);

  // Otimizado: useEffect consolidado para atualizar todo o checklist de uma vez
  // Reduz de 3 useEffects separados para 1 único, diminuindo re-renders
  useEffect(() => {
    const docOk =
      recipient?.nome?.trim()?.length > 0 &&
      recipient?.tipoDocumento?.trim()?.length > 0 &&
      recipient?.numeroDocumento?.trim()?.length > 0;

    // Usando setChecklist diretamente para evitar dependência de updateChecklist
    // e atualizar todos os valores de uma vez
    setChecklist((prev) => ({
      ...prev,
      documento: docOk,
      foto: photos && photos.length > 0,
      signature: !!signature,
    }));
  }, [recipient?.nome, recipient?.tipoDocumento, recipient?.numeroDocumento, photos?.length, signature]);

  // Funções de navegação de etapa
  const goToNextStep = useCallback(() => {
    setEtapa((prev) => Math.min(prev + 1, 5));
  }, []);

  const goToPreviousStep = useCallback(() => {
    setEtapa((prev) => Math.max(prev - 1, 1));
  }, []);

  // Funções de recipient
  const updateRecipient = useCallback((data: Partial<RecipientData>) => {
    setRecipient((prev) => ({ ...prev, ...data }));
  }, []);

  const resetRecipient = useCallback(() => {
    setRecipient(RECIPIENT_INITIAL);
  }, []);

  // Funções de mídia
  const addFoto = useCallback((foto: ImagePicker.ImagePickerAsset) => {
    setPhotos((prev) => [...prev, foto]);
  }, []);

  const removeFoto = useCallback((index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const setSignature = useCallback((data: string | null) => {
    setSignatureState(data);
  }, []);

  // Materials functions
  // Marca o serviceId cujos materiais já foram buscados (evita loop de fetch em
  // serviços sem materiais). Resetado quando o serviceId muda.
  const materialsFetchedRef = useRef<string | null>(null);

  const fetchMaterials = useCallback(async () => {
    if (!serviceId) return;

    // Se já temos materiais do serviço, não precisa buscar novamente
    if (service?.materials && service.materials.length > 0) {
      const materials = service.materials;
      const allChecked = materials.every(m => m.status !== 'PENDING');
      setMaterialsState({
        materials,
        loading: false,
        allChecked,
      });
      return;
    }

    // Idempotente por serviceId: serviços SEM materiais retornam lista vazia, mantendo
    // materials.length === 0 — sem este guard, o useEffect que dispara o fetch
    // (condicionado a length===0) re-chamaria infinitamente, gerando storm de
    // requests e 429 (ThrottlerException). Tenta no máximo uma vez por serviceId.
    if (materialsFetchedRef.current === serviceId) return;
    materialsFetchedRef.current = serviceId;

    // Se não tem materiais no serviço, busca da API
    setMaterialsState(prev => ({ ...prev, loading: true }));

    try {
      const response = await serviceService.getMaterials(serviceId);
      if (response.success && response.result) {
        const materials = response.result;
        const allChecked = materials.every(m => m.status !== 'PENDING');
        setMaterialsState({
          materials,
          loading: false,
          allChecked,
        });
      } else {
        setMaterialsState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error fetching materials:', error);
      setMaterialsState(prev => ({ ...prev, loading: false }));
      // Em ERRO (ex.: 429 transitório, rede), liberamos o guard após um backoff para
      // permitir nova tentativa — mas com atraso, para não reentrar em storm/throttle.
      // (Empty-success NÃO cai aqui: mantém marcado, evitando loop em serviços sem itens.)
      const sid = serviceId;
      setTimeout(() => {
        if (materialsFetchedRef.current === sid) {
          materialsFetchedRef.current = null;
        }
      }, 4000);
    }
  }, [serviceId, service?.materials]);

  const checkMaterial = useCallback(async (
    materialId: string,
    data: { status: MaterialStatus; actualQuantity?: number; notes?: string; photoProof?: string }
  ): Promise<boolean> => {
    if (!serviceId) return false;

    // Optimistic update - atualiza UI imediatamente
    setMaterialsState(prev => {
      const updatedMaterials = prev.materials.map(m =>
        m.id === materialId
          ? {
            ...m,
            status: data.status,
            actualQuantity: data.actualQuantity,
            checkNotes: data.notes,
            checkPhotoProof: data.photoProof,
            checkedAt: new Date().toISOString(),
          }
          : m
      );
      const allChecked = updatedMaterials.every(m => m.status !== 'PENDING');
      return {
        materials: updatedMaterials,
        loading: prev.loading,
        allChecked,
      };
    });

    // Dispara mutation
    checkMaterialMutation.checkMaterial({
      serviceId,
      materialId,
      data,
    });

    return true;
  }, [serviceId, checkMaterialMutation]);

  const setMaterials = useCallback((materials: ServiceMaterialResponse[]) => {
    const allChecked = materials.every(m => m.status !== 'PENDING');
    setMaterialsState({
      materials,
      loading: false,
      allChecked,
    });
  }, []);

  // Função para marcar check como completo
  const completeCheck = useCallback(() => {
    setCheckCompleted(true);
  }, []);

  // Função para marcar o check de retorno como completo
  const completeReturnCheck = useCallback(() => {
    setReturnCheckCompleted(true);
  }, []);

  // `hasReturn`: esta parada tem coleta/devolução no mesmo stop. Fonte de verdade é a
  // flag do backend; como fallback, inferimos da presença de materiais direction=PICKUP.
  const hasReturn = !!(
    service?.hasReturn ||
    (service?.materials?.some((m) => m.direction === 'PICKUP') ?? false)
  );

  // TRANSFER: conclui a perna de COLETA na origem. Faz snapshot da evidência atual
  // (recebedor/assinatura/fotos/obs) em `pickupEvidence`, reseta os campos de evidência
  // para a perna de ENTREGA e avança o wizard para o destino.
  const commitPickupLeg = useCallback(() => {
    const photoUrls = (photos as { uri: string; __s3Url?: string }[])
      .map((p) => p.__s3Url ?? (p.uri.startsWith('http') ? p.uri : undefined))
      .filter((u): u is string => !!u);
    const sigUrl = signature ?? undefined;

    setPickupEvidence({
      receivedBy: recipient.nome || undefined,
      signatureUrl: sigUrl,
      photoUrls,
      notes: observation || undefined,
    });

    // Reset da evidência para a perna de entrega (destino B).
    setRecipient(RECIPIENT_INITIAL);
    setPhotos([]);
    setSignatureState(null);
    setObservation('');
    setChecklist(CHECKLIST_INITIAL);
    setCheckCompleted(false);
    setDelivered(false);

    setPickupDone(true);
    setTransferLeg('delivery');
    setEtapa(1);
  }, [photos, signature, recipient.nome, observation]);

  // Formulário dinâmico - se o service tem formGroups
  const hasFormGroups = !!(service?.formGroupIds && service.formGroupIds.length > 0);

  // Buscar form groups do service
  const fetchFormGroups = useCallback(async () => {
    const ids = service?.formGroupIds;
    if (!ids || ids.length === 0) return;

    setFormState(prev => ({ ...prev, loading: true }));
    try {
      const groups: FormGroupResponse[] = [];
      for (const id of ids) {
        const response = await formGroupService.findOne(id);
        if (response.result) {
          groups.push(response.result);
        }
      }
      setFormState(prev => ({ ...prev, formGroups: groups, loading: false }));
    } catch (error) {
      console.error('Error fetching form groups:', error);
      setFormState(prev => ({ ...prev, loading: false }));
    }
  }, [service?.formGroupIds]);

  // Atualizar resposta de uma pergunta
  const setFormAnswer = useCallback((questionId: string, value: string | string[]) => {
    setFormState(prev => ({
      ...prev,
      formAnswersMap: { ...prev.formAnswersMap, [questionId]: value },
    }));
  }, []);

  // Enviar respostas do formulário
  const submitFormAnswers = useCallback(async () => {
    if (!service?.id || !service?.formGroupIds) return;

    const formGroups = formState.formGroups;
    for (const fg of formGroups) {
      const formAnswers = fg.forms.map(form => ({
        formId: form.id,
        answers: form.questions
          .map(q => ({
            questionId: q.id,
            value: formState.formAnswersMap[q.id] ?? '',
          }))
          .filter(a => a.value !== '' && !(Array.isArray(a.value) && a.value.length === 0)),
      })).filter(fa => fa.answers.length > 0);

      if (formAnswers.length > 0) {
        await createFormGroupAnswerMutation.createFormGroupAnswer({
          formGroupId: fg.id,
          respondedAt: new Date().toISOString(),
          entityType: FormEntityType.SERVICE,
          entityId: service.id,
          formAnswers,
        });
      }
    }

    setFormState(prev => ({ ...prev, formCompleted: true }));
  }, [service?.id, formState.formGroups, formState.formAnswersMap, createFormGroupAnswerMutation]);

  // Auto-fetch form groups quando service carregar com formGroupIds
  useEffect(() => {
    if (service?.formGroupIds && service.formGroupIds.length > 0 && formState.formGroups.length === 0 && !formState.loading) {
      fetchFormGroups();
    }
  }, [service?.formGroupIds]);

  // ========================================================================
  // Persistência do draft (in-progress evidence) — backend é fonte de verdade,
  // AsyncStorage é cache local para hidratação sem flicker.
  // ========================================================================
  const {
    draft: backendDraft,
    draftUpdatedAt: backendDraftUpdatedAt,
    isFetched: backendDraftFetched,
  } = useGetServiceDraft(serviceId);
  const { saveDraft: saveBackendDraft } = useSaveServiceDraft();

  // hydratedRef === serviceId quando aquele serviceId já foi hidratado nesta sessão.
  // Garante que (a) só hidratamos uma vez por troca de parada e
  //            (b) edições do usuário após hidratação não são sobrescritas.
  const hydratedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const SAVE_DEBOUNCE_MS = 800;

  // URIs locais já em upload — evita disparar duas vezes para a mesma foto.
  const inFlightUploadsRef = useRef<Set<string>>(new Set());
  const inFlightSignatureRef = useRef<string | null>(null);

  // Status terminal => não persistir nem hidratar nada (e limpar resíduo local).
  const isTerminalStatus =
    service?.status === ServiceStatus.COMPLETED ||
    service?.status === ServiceStatus.FAILED ||
    service?.status === ServiceStatus.CANCELED;

  // Reset do flag de hidratação quando o serviceId muda.
  useEffect(() => {
    hydratedRef.current = null;
    materialsFetchedRef.current = null;
  }, [serviceId]);

  // Hidratação: roda 1x por serviceId, quando o draft do backend já chegou (ou falhou).
  useEffect(() => {
    if (!serviceId || !backendDraftFetched) return;
    if (hydratedRef.current === serviceId) return;

    let cancelled = false;
    const run = async () => {
      if (isTerminalStatus) {
        await clearParadaDraft(serviceId);
        hydratedRef.current = serviceId;
        return;
      }

      const localDraft = await loadParadaDraft(serviceId);
      if (cancelled) return;

      const backendTs = backendDraftUpdatedAt ? new Date(backendDraftUpdatedAt).getTime() : 0;
      const localTs = localDraft?.localUpdatedAt ?? 0;

      // Last-write-wins: prefer the most recent. Em empate, preferir o local
      // (que reflete edições do usuário ainda não sincronizadas com o backend).
      let chosen: ServiceDraftData | null = null;
      if (backendDraft && backendTs > localTs) {
        chosen = backendDraft;
      } else if (localDraft) {
        chosen = localDraft;
      } else if (backendDraft) {
        chosen = backendDraft;
      }

      if (chosen) {
        if (chosen.recipient) {
          setRecipient({
            tipo: (chosen.recipient.tipo as RecipientType | null) ?? null,
            nome: chosen.recipient.nome ?? '',
            tipoDocumento: chosen.recipient.tipoDocumento ?? 'RG',
            numeroDocumento: chosen.recipient.numeroDocumento ?? '',
          });
        }
        if (chosen.observation !== undefined) setObservation(chosen.observation);
        if (chosen.checklist) {
          setChecklist(prev => ({ ...prev, ...chosen.checklist }));
        }
        if (chosen.photoUrls && chosen.photoUrls.length > 0) {
          // `uri` = presigned (carrega no <Image>); `__s3Url` = chave (persistência/submissão).
          const signed = chosen.photoUrlsSigned;
          const restored = chosen.photoUrls.map((key, i) => ({
            uri: signed?.[i] ?? key,
            width: 0,
            height: 0,
            type: 'image',
            __s3Url: key,
            __uploadStatus: 'uploaded',
            __localUri: signed?.[i] ?? key,
          })) as unknown as ImagePicker.ImagePickerAsset[];
          setPhotos(restored);
        }
        if (chosen.signatureUrl) setSignatureState(chosen.signatureUrl);
        if (chosen.paymentAmountCents !== undefined && chosen.paymentAmountCents > 0) {
          // Re-format cents back into the BRL-masked string the UI expects.
          const reais = (chosen.paymentAmountCents / 100).toFixed(2).replace('.', ',');
          setPaymentAmount(`R$ ${reais}`);
        }
        if (chosen.paymentMethod) setPaymentMethod(chosen.paymentMethod as PaymentMethodType);
        if (chosen.etapa) setEtapa(chosen.etapa);
        if (chosen.formAnswers && Object.keys(chosen.formAnswers).length > 0) {
          setFormState(prev => ({
            ...prev,
            formAnswersMap: { ...prev.formAnswersMap, ...chosen.formAnswers },
          }));
        }
        // TRANSFER: restaura a perna do wizard + snapshot da evidência da origem.
        if (chosen.transferLeg) setTransferLeg(chosen.transferLeg);
        if (chosen.pickupDone) setPickupDone(true);
        if (chosen.pickupEvidence) {
          setPickupEvidence({
            receivedBy: chosen.pickupEvidence.receivedBy,
            signatureUrl: chosen.pickupEvidence.signatureUrl,
            photoUrls: chosen.pickupEvidence.photoUrls ?? [],
            notes: chosen.pickupEvidence.notes,
          });
        }
      }

      hydratedRef.current = serviceId;
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [serviceId, backendDraftFetched, backendDraft, backendDraftUpdatedAt, isTerminalStatus]);

  // Auto-upload incremental de fotos. Detecta assets adicionados ao array de fotos
  // (via MultiPhotoPicker ou diretamente via setPhotos) que ainda não têm `__s3Url`,
  // marca como 'uploading' e sobe ao S3 em background. Quando termina, troca `uri`
  // pela URL S3 e marca 'uploaded'. Em falha, marca 'failed' para retry manual.
  useEffect(() => {
    if (!serviceId || isTerminalStatus) return;

    type MaybeUploadingAsset = ImagePicker.ImagePickerAsset & {
      __s3Url?: string;
      __uploadStatus?: 'uploading' | 'uploaded' | 'failed';
      __localUri?: string;
    };

    const pending = (photos as MaybeUploadingAsset[]).filter(p => {
      if (p.__s3Url) return false;
      if (p.uri.startsWith('http')) return false;
      if (p.__uploadStatus === 'uploading') return false;
      if (p.__uploadStatus === 'uploaded') return false;
      if (p.__uploadStatus === 'failed') return false; // requires manual retry via retryPhotoUpload
      if (inFlightUploadsRef.current.has(p.uri)) return false;
      return true;
    });

    if (pending.length === 0) return;

    // Mark them as uploading synchronously (single setPhotos call) so we don't re-enter.
    const markedUris = new Set(pending.map(p => p.uri));
    pending.forEach(p => inFlightUploadsRef.current.add(p.uri));
    setPhotos(prev =>
      (prev as MaybeUploadingAsset[]).map(p =>
        markedUris.has(p.uri)
          ? ({ ...p, __localUri: p.uri, __uploadStatus: 'uploading' } as unknown as ImagePicker.ImagePickerAsset)
          : p,
      ),
    );

    // Fire-and-forget per-asset uploads.
    pending.forEach(async (asset) => {
      try {
        const urls = await uploadMultipleServicePhotos([asset], serviceId, 'before');
        const s3Url = urls[0];
        setPhotos(prev =>
          (prev as MaybeUploadingAsset[]).map(p => {
            const localKey = p.__localUri ?? p.uri;
            if (localKey !== asset.uri) return p;
            // NÃO trocar `uri` pela key do S3: o backend retorna a KEY relativa
            // (ex.: "services/.../photo.jpg"), que o <Image> não consegue carregar
            // (miniatura em branco). Mantemos o `uri` LOCAL para o preview e guardamos
            // a key em `__s3Url` — a submissão e o filtro de pendentes usam `__s3Url`.
            return s3Url
              ? ({ ...p, __s3Url: s3Url, __uploadStatus: 'uploaded', __localUri: localKey } as unknown as ImagePicker.ImagePickerAsset)
              : ({ ...p, __uploadStatus: 'failed', __localUri: localKey } as unknown as ImagePicker.ImagePickerAsset);
          }),
        );
      } catch (err) {
        if (__DEV__) {
          console.warn('[ParadaContext] incremental photo upload failed:', err);
        }
        setPhotos(prev =>
          (prev as MaybeUploadingAsset[]).map(p => {
            const localKey = p.__localUri ?? p.uri;
            if (localKey !== asset.uri) return p;
            return { ...p, __uploadStatus: 'failed', __localUri: localKey } as unknown as ImagePicker.ImagePickerAsset;
          }),
        );
      } finally {
        inFlightUploadsRef.current.delete(asset.uri);
      }
    });
  }, [photos, serviceId, isTerminalStatus, setPhotos]);

  // Auto-upload incremental da assinatura. Quando recebemos base64 (saveAssinatura
  // do canvas), sobe ao S3 e troca o valor por URL — assim mesmo um crash não perde
  // a assinatura coletada.
  useEffect(() => {
    if (!serviceId || isTerminalStatus) return;
    if (!signature) return;
    if (!signature.startsWith('data:')) return; // já é URL
    if (inFlightSignatureRef.current === signature) return;

    inFlightSignatureRef.current = signature;

    // Timeout defensivo: se a request travar (rede caída sem rejeição), libera
    // o ref para permitir retry em próximos renders.
    const SIGNATURE_UPLOAD_TIMEOUT_MS = 15000;
    let timedOut = false;
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        timedOut = true;
        resolve(null);
      }, SIGNATURE_UPLOAD_TIMEOUT_MS);
    });

    Promise.race([uploadBase64Signature(signature, serviceId), timeoutPromise])
      .then(url => {
        if (timedOut) {
          if (__DEV__) {
            console.warn('[ParadaContext] signature upload timed out, will retry on next render');
          }
          return;
        }
        if (url) {
          setSignatureState(url);
        }
      })
      .catch(err => {
        if (__DEV__) {
          console.warn('[ParadaContext] incremental signature upload failed:', err);
        }
      })
      .finally(() => {
        inFlightSignatureRef.current = null;
      });
  }, [signature, serviceId, isTerminalStatus]);

  // Auto-save com debounce. Só roda depois da hidratação estar completa para o
  // serviceId atual. Persiste local imediatamente; backend com debounce de 800ms.
  // `finalizing` corta TUDO — durante o handleFinalizar o status do service vai virar
  // COMPLETED e qualquer save em andamento causaria erro/no-op. Cleanup limpa o timer.
  useEffect(() => {
    if (!serviceId) return;
    if (hydratedRef.current !== serviceId) return;
    if (isTerminalStatus) return;
    if (finalizing) return;

    const photoUrls = (photos as { uri: string; __s3Url?: string }[])
      .map(p => p.__s3Url ?? (p.uri.startsWith('http') ? p.uri : undefined))
      .filter((u): u is string => !!u);

    const sigUrl = signature && signature.startsWith('http') ? signature : undefined;
    const cents = paymentAmount ? parseBRLToCents(paymentAmount) : null;

    const hasContent =
      !!recipient.nome ||
      !!observation ||
      photoUrls.length > 0 ||
      !!sigUrl ||
      (cents !== null && cents > 0) ||
      !!paymentMethod ||
      Object.keys(formState.formAnswersMap).length > 0 ||
      // TRANSFER: a perna/coleta concluída é conteúdo relevante (mesmo sem recebedor),
      // para retomar a perna de entrega após crash.
      (isTransfer && (pickupDone || transferLeg === 'delivery'));

    if (!hasContent) return;

    const draft: ServiceDraftData = {
      recipient: {
        tipo: recipient.tipo ?? undefined,
        nome: recipient.nome || undefined,
        tipoDocumento: recipient.tipoDocumento || undefined,
        numeroDocumento: recipient.numeroDocumento || undefined,
      },
      observation: observation || undefined,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
      signatureUrl: sigUrl,
      paymentAmountCents: cents !== null && cents > 0 ? cents : undefined,
      paymentMethod: paymentMethod ?? undefined,
      etapa,
      checklist,
      formAnswers:
        Object.keys(formState.formAnswersMap).length > 0 ? formState.formAnswersMap : undefined,
      // TRANSFER: estado do wizard de 2 pernas + snapshot da evidência da origem.
      ...(isTransfer
        ? {
            transferLeg,
            pickupDone,
            pickupEvidence: pickupEvidence
              ? {
                  receivedBy: pickupEvidence.receivedBy,
                  signatureUrl: pickupEvidence.signatureUrl,
                  photoUrls: pickupEvidence.photoUrls,
                  notes: pickupEvidence.notes,
                }
              : undefined,
          }
        : {}),
    };

    // Local: gravação síncrona-rápida (cache para hidratar sem flicker / offline).
    const localDraft: ParadaDraft = { ...draft, localUpdatedAt: Date.now() };
    void saveParadaDraft(serviceId, localDraft);

    // Backend: debounced fire-and-forget. Falhas só são logadas (vide useSaveServiceDraft).
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveBackendDraft({
        id: serviceId,
        draft: { ...draft, clientDraftUpdatedAt: new Date().toISOString() },
      });
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [
    serviceId,
    isTerminalStatus,
    finalizing,
    recipient,
    observation,
    photos,
    signature,
    paymentAmount,
    paymentMethod,
    etapa,
    checklist,
    formState.formAnswersMap,
    saveBackendDraft,
    isTransfer,
    transferLeg,
    pickupDone,
    pickupEvidence,
  ]);

  // Função de reset
  const resetState = useCallback(() => {
    setEtapa(1);
    setDelivered(false);
    setRecipient(RECIPIENT_INITIAL);
    setPhotos([]);
    setSignatureState(null);
    setChecklist(CHECKLIST_INITIAL);
    setObservation('');
    setShowNavigation(false);
    setShowSuccess(false);
    setFinalizing(false);
    setShowSignature(false);
    setUploadProgress(new Map());
    setCheckCompleted(false);
    setReturnCheckCompleted(false);
    setTransferLeg('pickup');
    setPickupDone(false);
    setPickupEvidence(null);
    setMaterialsState({
      materials: [],
      loading: false,
      allChecked: false,
    });
    setPaymentAmount('');
    setPaymentMethod(null);
    setShowPaymentModal(false);
    setDeliveryCode('');
    setBypassReasonCode(null);
    setBypassReasonText('');
    setPickupCode('');
    setPickupBypassReasonCode(null);
    setPickupBypassReasonText('');
    setFormState({
      formGroups: [],
      formAnswersMap: {},
      formCompleted: false,
      loading: false,
    });
    // Limpa o draft local e o do backend (best-effort).
    if (serviceId) {
      void clearParadaDraft(serviceId);
      void serviceService.clearDraft(serviceId).catch(() => {});
    }
  }, [serviceId]);

  // Reset payment state quando o serviceId mudar — evita carregar valores da parada anterior
  useEffect(() => {
    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentMethod(null);
    setDeliveryCode('');
    setBypassReasonCode(null);
    setBypassReasonText('');
    setPickupCode('');
    setPickupBypassReasonCode(null);
    setPickupBypassReasonText('');
  }, [serviceId]);

  const value: ParadaContextValue = {
    // Dados do serviço
    service,
    effectiveAddress,
    isLoading,
    serviceError: isError,

    // IDs
    rotaId,
    serviceId,

    // Estado da etapa
    etapa,
    setEtapa,
    goToNextStep,
    goToPreviousStep,

    // Flags de estado
    arrived,
    setArrived,
    delivered,
    setDelivered,

    // Dados do recipient
    recipient,
    updateRecipient,
    resetRecipient,

    // Mídia
    photos,
    signature,
    addFoto,
    removeFoto,
    setPhotos,
    setSignature,

    // Estados de modais de mídia
    showSignature,
    setShowSignature,

    // Checklist
    checklist,
    updateChecklist,

    // Observação
    observation,
    setObservation,

    // Navegação modal
    showNavigation,
    setShowNavigation,

    // Estado de sucesso
    showSuccess,
    setShowSuccess,

    // Estado de finalização
    finalizing,
    setFinalizing,

    // Upload progress
    uploadProgress,
    setUploadProgress,

    // Materials state
    materialsState,
    fetchMaterials,
    checkMaterial,
    setMaterials,
    checkCompleted,
    completeCheck,

    // Coleta de retorno
    hasReturn,
    returnCheckCompleted,
    completeReturnCheck,

    // TRANSFER
    isTransfer,
    transferLeg,
    setTransferLeg,
    pickupDone,
    pickupEvidence,
    commitPickupLeg,

    // Gating de início de parada (regras configuráveis da empresa)
    canStartService,
    startBlockReason,

    // Utilitários
    isServiceStarted: !!isServiceStarted,
    resetState,

    // Pagamento (cobrança na entrega)
    showPaymentModal,
    setShowPaymentModal,
    paymentAmount,
    setPaymentAmount,
    paymentMethod,
    setPaymentMethod,

    // Código de confirmação de entrega
    deliveryCode,
    setDeliveryCode,
    bypassReasonCode,
    setBypassReasonCode,
    bypassReasonText,
    setBypassReasonText,

    // Código de confirmação de retirada
    pickupCode,
    setPickupCode,
    pickupBypassReasonCode,
    setPickupBypassReasonCode,
    pickupBypassReasonText,
    setPickupBypassReasonText,

    // Formulário dinâmico
    formGroups: formState.formGroups,
    formAnswersMap: formState.formAnswersMap,
    formCompleted: formState.formCompleted,
    hasFormGroups,
    formLoading: formState.loading,
    fetchFormGroups,
    setFormAnswer,
    submitFormAnswers,
  };

  return (
    <ParadaContext.Provider value={value}>{children}</ParadaContext.Provider>
  );
}

export function useParada() {
  const context = useContext(ParadaContext);
  if (!context) {
    throw new Error('useParada deve ser usado dentro de um ParadaProvider');
  }
  return context;
}
