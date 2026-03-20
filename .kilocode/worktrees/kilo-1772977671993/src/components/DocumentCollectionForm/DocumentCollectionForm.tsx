import React from 'react';

import {
  createRestyleComponent,
} from '@shopify/restyle';

import { Theme } from '@/theme';

import { FormDropDown } from '../Form/FormDropDown';
import { FormTextInput } from '../Form/FormTextInput';
import { Text } from '../Text/Text';


export interface DocumentData {
  recipientName: string;
  documentType: 'RG' | 'CPF' | 'OUTRO';
  documentNumber: string;
}

type DocumentCollectionFormProps = {
  data: DocumentData;
  onChange: (data: DocumentData) => void;
  labelPreset?: keyof Theme['textVariants'];
  padding?: keyof Theme['spacing'];
};

type ComposeProps = {
  backgroundColor?: string;
  padding?: keyof Theme['spacing'];
} & DocumentCollectionFormProps;

const DOCUMENT_TYPES = [
  { label: 'RG', value: 'RG' },
  { label: 'CPF', value: 'CPF' },
  { label: 'Outro', value: 'OUTRO' },
];

export default function DocumentCollectionForm({
  data,
  onChange,
  labelPreset = 'textParagraph',
  padding = 's',
  backgroundColor = 'transparent',
  ...props
}: DocumentCollectionFormProps) {
  const updateField = <K extends keyof DocumentData>(
    field: K,
    value: DocumentData[K],
  ) => {
    onChange({ ...data, [field]: value });
  };

  const Container = createRestyleComponent<ComposeProps, Theme>(
    ['backgroundColor', 'padding'],
    ({ children }) => children,
  );

  return (
    <Container
      backgroundColor={backgroundColor}
      padding={padding}
      {...props}
    >
      <Text
        preset={labelPreset}
        marginBottom="s"
        color="colorTextPrimary"
        fontWeightPreset="bold"
      >
        Dados do Documento
      </Text>

      <FormTextInput
        label="Nome do Documentado"
        placeholder="Digite o nome completo"
        value={data.recipientName}
        onChangeText={(value) => updateField('recipientName', value)}
        required
      />

      <FormDropDown
        label="Tipo de Documento"
        placeholder="Selecione o tipo"
        items={DOCUMENT_TYPES}
        value={DOCUMENT_TYPES.find((item) => item.value === data.documentType)}
        onSelectItem={(item) => updateField('documentType', item.value)}
        required
      />

      <FormTextInput
        label="Número do Documento"
        placeholder="Digite o número"
        value={data.documentNumber}
        onChangeText={(value) => updateField('documentNumber', value)}
        required
      />
    </Container>
  );
}

export type { DocumentData, DocumentCollectionFormProps };
