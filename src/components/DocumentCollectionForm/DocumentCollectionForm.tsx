import React from 'react';

import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Dropdown } from '../DropDown/DropDown';
import { Input } from '../Input/Input';
import { MyItemTypeDropDown } from '../RestyleComponent/RestyleComponent';

export interface DocumentData {
  recipientName: string;
  documentType: 'RG' | 'CPF' | 'OUTRO';
  documentNumber: string;
}

type DocumentCollectionFormProps = {
  data: DocumentData;
  onChange: (data: DocumentData) => void;
};

const DOCUMENT_TYPES: MyItemTypeDropDown[] = [
  { label: 'RG', value: 'RG' },
  { label: 'CPF', value: 'CPF' },
  { label: 'Outro', value: 'OUTRO' },
];

export default function DocumentCollectionForm({
  data,
  onChange,
}: DocumentCollectionFormProps) {
  const updateField = <K extends keyof DocumentData>(
    field: K,
    value: DocumentData[K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  const handleDocumentTypeChange = (item: MyItemTypeDropDown) => {
    // Limpar número do documento ao mudar o tipo
    onChange({
      ...data,
      documentType: item.value as DocumentData['documentType'],
      documentNumber: '',
    });
  };

  const isCpf = data.documentType === 'CPF';

  return (
    <Box backgroundColor="transparent">
      <Input
        title="Nome do cliente"
        placeholder="Digite o nome completo"
        value={data.recipientName}
        onChangeText={(value) => updateField('recipientName', value)}
        width="auto"
      />

      <Box marginTop="y12" mb='b14' mt='t20'>
        <Dropdown
          width={measure.x70}
          search={false}
          title="Tipo de Documento"
          placeholder="Selecione o tipo"
          data={DOCUMENT_TYPES}
          value={DOCUMENT_TYPES.find((item) => item.value === data.documentType)}
          onChange={handleDocumentTypeChange}
          setItemSelected={handleDocumentTypeChange}
          labelField="label"
          valueField="value"
          selectedItemTextStyle={{ fontSize: measure.f14, textAlign: 'left' }}
          widthIcon={measure.m20}
          heightIcon={measure.m20}
        />
      </Box>

      <Input
        title="Número do Documento"
        placeholder={isCpf ? '000.000.000-00' : 'Digite o número'}
        value={data.documentNumber}
        onChangeText={(value) => updateField('documentNumber', value)}
        width="auto"
        keyboardType='numeric'
        typeMask={isCpf ? 'cpf' : undefined}
      />
    </Box>
  );
}
