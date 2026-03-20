import { useRef } from 'react';
import { Pressable, Input } from 'react-native';

import { measure } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { ResendTimerButton } from '../ResendTimerButton';
import { Text } from '../Text/Text';

interface PinValidationProps {
  codeLength: number;
  message: React.ReactNode;
  onResendCode: () => void;
  initialResendSeconds?: number;
  code: string,
  setCode: (code: string) => void
}

export function PinValidation({
  message,
  onResendCode,
  initialResendSeconds,
  code,
  setCode,
  codeLength
}: PinValidationProps) {

  const inputRef = useRef<Input | null>(null);
  const openKeyboard = () => {
    inputRef.current?.focus();
  };

  const handleTextChange = (value: string) => {
    if (value.length <= codeLength) {
      setCode(value);
    }
  };

  return (
    <Box justifyContent="space-between" paddingBottom="b12" flex={1}>
      <Box alignItems="center" mt="t36">
        <Text preset="textParagraph" textAlign="center" mb="b56">
          {message}
        </Text>
        <Box flexDirection="row" justifyContent="space-between" width={measure.x300}>
          {Array(codeLength)
            .fill('')
            .map((_, index) => (
              <Pressable onPress={openKeyboard} key={index}>
                <Box
                  borderColor={code[index] ? 'primary100' : 'gray700'}
                  borderWidth={measure.m2}
                  width={measure.x40}
                  height={measure.y40}
                  borderRadius="s20"
                  alignItems="center"
                  justifyContent="center">
                  <Text>{code[index]}</Text>
                </Box>
              </Pressable>
            ))}
        </Box>
        <Box flexDirection="row" mt="t14">
          <Box flex={5} alignItems='flex-end' >
            <Text preset="textParagraphSmall">Não recebeu o código?</Text>
          </Box>
          <Box flex={7}>
            <ResendTimerButton
              onResendRequest={onResendCode}
              initialSeconds={initialResendSeconds}
            />
          </Box>
        </Box>
        <Box>
          <Input
            ref={inputRef}
            style={{
              position: 'absolute',
              opacity: 0,
            }}
            keyboardType="numeric"
            maxLength={6}
            value={code}
            onChangeText={handleTextChange}
            autoFocus
          />
        </Box>
      </Box>
    </Box>
  );
}
