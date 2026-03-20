import { useCallback, useState } from 'react';
import { Modal, Platform, TouchableOpacity } from 'react-native';

import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useTheme } from '@shopify/restyle';
import { TextInputMask } from 'react-native-masked-text';

import { formatDatePtBr } from '@/functions';
import { measure, TextVariantsPreset, Theme } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Button } from '../Button/Button';
import { Icon } from '../Icon/Icon';
import { TextInputBoxProps } from '../RestyleComponent/RestyleComponent';
import { Text } from '../Text/Text';

export interface DatePickerProps extends TextInputBoxProps {
  minYear?: number;
  date?: Date;
  title: string;
  setDate: (date?: Date) => void;
  messageError?: string;
  widthBox?: number;
  textPreset?: TextVariantsPreset;
}

export function DatePicker({
  minYear = 18,
  date,
  title,
  setDate,
  textPreset = 'textParagraph',
  width: _width,
  widthBox: _widthBox,
  messageError,
  ..._rest
}: DatePickerProps) {
  const theme = useTheme<Theme>();
  const [show, setShow] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(date ?? getMaximumDate());
  const [inputValue, setInputValue] = useState(date ? formatDatePtBr(date) : '');
  const [isFocused, setIsFocused] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();

  function getMaximumDate(): Date {
    const today = new Date();
    return new Date(
      today.getFullYear() - minYear,
      today.getMonth(),
      today.getDate()
    );
  }

  function getMinimumDate(): Date {
    // Data mínima: 120 anos atrás (pessoa mais velha possível)
    const today = new Date();
    return new Date(
      today.getFullYear() - 120,
      0,
      1
    );
  }

  function showDatePicker() {
    setTempDate(date ?? getMaximumDate());
    setShow(true);
  }

  // Valida e parseia a data digitada
  // Apenas valida formato - regras de negócio (idade mínima) são validadas pelo schema do form
  const validateAndParseDate = useCallback((text: string): { valid: boolean; date?: Date; error?: string } => {
    // Remove espaços
    const trimmed = text.trim();
    
    // Verifica se tem o formato completo DD/MM/AAAA
    if (trimmed.length !== 10) {
      return { valid: false };
    }

    const parts = trimmed.split('/');
    if (parts.length !== 3) {
      return { valid: false, error: 'Formato inválido' };
    }

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);

    // Validações básicas de formato
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return { valid: false, error: 'Data inválida' };
    }

    if (month < 1 || month > 12) {
      return { valid: false, error: 'Mês inválido' };
    }

    if (day < 1 || day > 31) {
      return { valid: false, error: 'Dia inválido' };
    }

    if (year < 1900 || year > new Date().getFullYear()) {
      return { valid: false, error: 'Ano inválido' };
    }

    // Cria a data e verifica se é válida
    const parsedDate = new Date(year, month - 1, day);
    
    // Verifica se a data criada corresponde aos valores inseridos
    // (para pegar casos como 31/02 que vira 03/03)
    if (
      parsedDate.getDate() !== day ||
      parsedDate.getMonth() !== month - 1 ||
      parsedDate.getFullYear() !== year
    ) {
      return { valid: false, error: 'Data inválida' };
    }

    // Data é válida no formato - passa para o form validar regras de negócio
    return { valid: true, date: parsedDate };
  }, []);

  function handleTextChange(text: string) {
    setInputValue(text);
    setValidationError(undefined);

    const result = validateAndParseDate(text);
    
    if (result.valid && result.date) {
      setDate(result.date);
    } else if (text.length === 10) {
      // Só mostra erro quando o usuário terminou de digitar
      setValidationError(result.error);
      setDate(undefined);
    } else if (text.length === 0) {
      setDate(undefined);
    }
  }

  function handleBlur() {
    setIsFocused(false);
    // Valida ao sair do campo
    if (inputValue && inputValue.length > 0 && inputValue.length < 10) {
      setValidationError('Data incompleta');
    }
  }

  function onChangeAndroid(event: DateTimePickerEvent, selectedDate: Date | undefined) {
    if (event.type === 'dismissed') {
      setShow(false);
      return;
    }
    setShow(false);
    if (selectedDate) {
      setDate(selectedDate);
      setInputValue(formatDatePtBr(selectedDate));
      setValidationError(undefined);
    }
  }

  function onChangeIOS(event: DateTimePickerEvent, selectedDate: Date | undefined) {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  }

  function confirmIOSDate() {
    setDate(tempDate);
    setInputValue(formatDatePtBr(tempDate));
    setValidationError(undefined);
    setShow(false);
  }

  function cancelIOSDate() {
    setShow(false);
  }

  const displayError = messageError || validationError;

  const inputTextStyle = {
    ...theme.textVariants[textPreset],
    color: theme.colors.gray700,
    flex: 1,
    paddingVertical: measure.y9,
    paddingLeft: measure.l2,
  };

  // Android: mostra o picker nativo
  if (Platform.OS === 'android') {
    return (
      <>
        {show && (
          <DateTimePicker
            mode="date"
            value={date ?? getMaximumDate()}
            display="calendar"
            maximumDate={getMaximumDate()}
            minimumDate={getMinimumDate()}
            onChange={onChangeAndroid}
          />
        )}
        <Box>
          <Box pl='l4' mb='b10'>
            {title && <Text color='gray600' preset='text14' fontWeightPreset='semibold'>{title}</Text>}
          </Box>
          <Box
            flexDirection="row"
            alignItems="center"
            paddingLeft="l14"
            paddingRight='r14'
            borderBottomWidth={measure.y1dot5}
            borderColor={isFocused ? (displayError ? 'redError' : 'primary100') : 'gray400'}
          >
            <TextInputMask
              type="datetime"
              options={{ format: 'DD/MM/YYYY' }}
              value={inputValue}
              onChangeText={handleTextChange}
              placeholder="DD/MM/AAAA"
              placeholderTextColor={theme.colors.gray200}
              keyboardType="numeric"
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              style={inputTextStyle}
            />
            <TouchableOpacity onPress={showDatePicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="calendar-month" color={isFocused ? 'primary100' : 'gray400'} size={measure.m24} />
            </TouchableOpacity>
          </Box>
          {displayError && (
            <Text preset="textValidateError" color="redError" marginLeft="l4">
              {displayError}
            </Text>
          )}
        </Box>
      </>
    );
  }

  // iOS: usa Modal para evitar crash
  return (
    <>
      <Modal
        visible={show}
        transparent
        animationType="slide"
        onRequestClose={cancelIOSDate}
      >
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: theme.colors.overlayBlack50 }}
          activeOpacity={1}
          onPress={cancelIOSDate}
        >
          <Box
            flex={1}
            justifyContent="flex-end"
          >
            <TouchableOpacity activeOpacity={1}>
              <Box
                backgroundColor="white"
                borderTopLeftRadius="s20"
                borderTopRightRadius="s20"
                paddingHorizontal="x20"
                pt="t16"
                pb="b32"
              >
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" mb="b16">
                  <Text preset="text17" fontWeightPreset="semibold">{title}</Text>
                  <TouchableOpacity onPress={cancelIOSDate}>
                    <Text preset="text15" color="gray400">Cancelar</Text>
                  </TouchableOpacity>
                </Box>
                
                <DateTimePicker
                  mode="date"
                  value={tempDate}
                  display="spinner"
                  maximumDate={getMaximumDate()}
                  minimumDate={getMinimumDate()}
                  onChange={onChangeIOS}
                  locale="pt-BR"
                  style={{ height: '100%' }}
                />
                
                <Box mt="t16">
                  <Button title="Confirmar" onPress={confirmIOSDate} />
                </Box>
              </Box>
            </TouchableOpacity>
          </Box>
        </TouchableOpacity>
      </Modal>
      
      <Box>
        <Box pl='l4' mb='b10'>
          {title && <Text color='gray600' preset='text14' fontWeightPreset='semibold'>{title}</Text>}
        </Box>
        <Box
          flexDirection="row"
          alignItems="center"
          paddingLeft="l14"
          paddingRight='r14'
          borderBottomWidth={measure.y1dot5}
          borderColor={isFocused ? (displayError ? 'redError' : 'primary100') : 'gray400'}
        >
          <TextInputMask
            type="datetime"
            options={{ format: 'DD/MM/YYYY' }}
            value={inputValue}
            onChangeText={handleTextChange}
            placeholder="DD/MM/AAAA"
            placeholderTextColor={theme.colors.gray200}
            keyboardType="numeric"
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            style={inputTextStyle}
          />
          <TouchableOpacity onPress={showDatePicker} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="calendar-month" color={isFocused ? 'primary100' : 'gray400'} size={measure.m24} />
          </TouchableOpacity>
        </Box>
        {displayError && (
          <Text preset="textValidateError" color="redError" marginLeft="l4">
            {displayError}
          </Text>
        )}
      </Box>
    </>
  );
}
