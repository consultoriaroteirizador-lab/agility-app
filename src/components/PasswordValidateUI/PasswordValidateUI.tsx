import { useEffect, useState } from 'react';

import { BoxProps } from '@shopify/restyle';

import { measure, Theme } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import { LocalIcon } from '../Icon/LocalIcon';
import { Text } from '../Text/Text';

interface PasswordValidateUIProps extends BoxProps<Theme> {
  password: string;
}

export function PasswordValidateUI({
  password,
  ...rest
}: PasswordValidateUIProps) {
  const [passwordValidation, setPasswordValidation] = useState({
    length: false,
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const validatePassword = (password: string) => {
    setPasswordValidation({
      length: password.length >= 8 && password.length <= 16,
      hasLowercase: /[a-z]/.test(password),
      hasUppercase: /[A-Z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[@$!%*?&#]/.test(password),
    });
  };

  useEffect(() => {
    validatePassword(password);
  }, [password]);

  return (
    <Box {...rest}>
      <Box flexDirection="row" alignItems="center" gap="x4">
        <LocalIcon
          iconName={passwordValidation.length ? 'check' : 'circleClose'}
          height={measure.y10}
          size={measure.x10}
          color={passwordValidation.length ? 'greenSuccess' : 'redError'}
        />
        <Text color="gray300" preset="textParagraphSuperSmall">
          De 8 a 16 caracteres
        </Text>
      </Box>
      <Box flexDirection="row" alignItems="center" gap="x4">
        <LocalIcon
          iconName={passwordValidation.hasLowercase ? 'check' : 'circleClose'}
          height={measure.y10}
          size={measure.x10}
          color={passwordValidation.hasLowercase ? 'greenSuccess' : 'redError'}
        />
        <Text color="gray300" preset="textParagraphSuperSmall">
          Letra minúscula
        </Text>
      </Box>
      <Box flexDirection="row" alignItems="center" gap="x4">
        <LocalIcon
          iconName={passwordValidation.hasUppercase ? 'check' : 'circleClose'}
          height={measure.y10}
          size={measure.x10}
          color={passwordValidation.hasUppercase ? 'greenSuccess' : 'redError'}
        />
        <Text color="gray300" preset="textParagraphSuperSmall">
          Letra maiúscula
        </Text>
      </Box>
      <Box flexDirection="row" alignItems="center" gap="x4">
        <LocalIcon
          iconName={passwordValidation.hasNumber ? 'check' : 'circleClose'}
          height={measure.y10}
          size={measure.x10}
          color={passwordValidation.hasNumber ? 'greenSuccess' : 'redError'}
        />
        <Text color="gray300" preset="textParagraphSuperSmall">
          Número
        </Text>
      </Box>
      <Box flexDirection="row" alignItems="center" gap="x4">
        <LocalIcon
          iconName={passwordValidation.hasSpecialChar ? 'check' : 'circleClose'}
          height={measure.y10}
          size={measure.x10}
          color={
            passwordValidation.hasSpecialChar ? 'greenSuccess' : 'redError'
          }
        />
        <Text color="gray300" preset="textParagraphSuperSmall">
          Símbolo (@$!%*?&#)
        </Text>
      </Box>
    </Box>
  );
}
