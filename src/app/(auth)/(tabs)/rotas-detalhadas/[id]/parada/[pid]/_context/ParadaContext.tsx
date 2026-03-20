import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';

import * as ImagePicker from 'expo-image-picker';

import type { ServiceMaterialResponse, MaterialStatus } from '@/domain/agility/service/dto/response/service-material.response';
import { ServiceStatus } from '@/domain/agility/service/dto/types';
import { serviceService } from '@/domain/agility/service/serviceService';
import { useFindOneService, useCheckMaterial } from '@/domain/agility/service/useCase';

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

export interface MaterialsState {
  materials: ServiceMaterialResponse[];
  loading: boolean;
  allChecked: boolean;
}

interface ParadaContextValue {
  // Dados do serviço
  service: ReturnType<typeof useFindOneService>['service'];
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
  setPhotos: (photos: ImagePicker.ImagePickerAsset[]) => void;
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

  // Utilitários
  isServiceStarted: boolean;
  resetState: () => void;
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

  // Hook para check de material
  const checkMaterialMutation = useCheckMaterial();

  // Estado da etapa
  const [etapa, setEtapa] = useState(1);
  const [arrived, setArrived] = useState(false);
  const [delivered, setDelivered] = useState(false);

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

  // Check completed flag
  const [checkCompleted, setCheckCompleted] = useState(false);

  // Checklist
  const [checklist, setChecklist] = useState<ChecklistState>(CHECKLIST_INITIAL);

  // Observação
  const [observation, setObservation] = useState('');

  // Modais e estados de UI
  const [showNavigation, setShowNavigation] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, { loaded: number; total: number; percentage: number }>>(new Map());

  // Verificar se o serviço já está iniciado
  const isServiceStarted =
    service &&
    (service.status === ServiceStatus.IN_PROGRESS ||
      service.startDate);

  // Função de checklist (declarada antes de ser usada)
  const updateChecklist = useCallback(
    (key: keyof ChecklistState, value: boolean) => {
      setChecklist((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Efeito para ajustar etapa baseado no status do serviço
  useEffect(() => {
    if (isServiceStarted && etapa === 1) {
      setEtapa(2);
      setArrived(true);
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

  // Função de reset
  const resetState = useCallback(() => {
    setEtapa(1);
    setArrived(false);
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
    setMaterialsState({
      materials: [],
      loading: false,
      allChecked: false,
    });
  }, []);

  const value: ParadaContextValue = {
    // Dados do serviço
    service,
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

    // Utilitários
    isServiceStarted: !!isServiceStarted,
    resetState,
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
