import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform } from 'react-native';

import { colors, ThemeSpace } from '@/theme';

import { Box } from '../BoxBackGround/BoxBackGround';
import {
  ScrollViewContainer,
  ViewContainer,
} from '../ScreenContainer/ScreenContainer';

interface ScreenBaseProps {
  scrollable?: boolean;
  children: ReactNode;
  buttonLeft?: ReactNode;
  buttonRight?: ReactNode;
  title?: ReactNode;
  mbScreenBase?: ThemeSpace;
  mtScreenBase?: ThemeSpace;
  marginHorizontalScreenBase?: ThemeSpace;
  imageBackground?: any;
  dismissKeyboardOnTouch?: boolean;
}

export function ScreenBase({
  scrollable,
  children,
  buttonLeft,
  buttonRight,
  title,
  marginHorizontalScreenBase = 'x20',
  mbScreenBase = 'b20',
  mtScreenBase = 't20',
}: ScreenBaseProps) {
  const Container = scrollable ? ScrollViewContainer : ViewContainer;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Container backgroundColor={colors.backgroundColor}>
        <Box
          flex={1}
          marginHorizontal={marginHorizontalScreenBase}
          mb={mbScreenBase}
          mt={mtScreenBase}
        >
          {(buttonLeft || title || buttonRight) && (
            <Box
              flexDirection="row"
              justifyContent="space-between"
              alignItems="center"
              mb="b10">
              <Box flex={1}>{buttonLeft}</Box>
              <Box alignItems="center" flex={8}>
                {title}
              </Box>
              <Box flex={1}>{buttonRight}</Box>
            </Box>
          )}
          {children}
        </Box>
      </Container>
    </KeyboardAvoidingView>
  );
}


// import { ReactNode } from 'react';
// import { KeyboardAvoidingView } from 'react-native';

// import { useAppTheme } from '@/hooks';
// import { ThemeSpace } from '@/theme';

// import { Box } from '../BoxBackGround/BoxBackGround';
// import {
//   ScrollViewContainer,
//   ViewContainer,
// } from '../ScreenContainer/ScreenContainer';

// interface ScreenBaseProps {
//   scrollable?: boolean;
//   children: ReactNode;
//   buttonLeft?: ReactNode;
//   buttonRight?: ReactNode;
//   title?: ReactNode;
//   mbScreenBase?: ThemeSpace
//   mtScreenBase?: ThemeSpace
//   marginHorizontalScreenBase?: ThemeSpace
// }

// export function ScreenBase({
//   scrollable,
//   children,
//   buttonLeft,
//   buttonRight,
//   title,
//   mbScreenBase = 'b20',
//   mtScreenBase = 't20',
//   marginHorizontalScreenBase = 'x20',
// }: ScreenBaseProps) {
//   const { colors } = useAppTheme();
//   const Container = scrollable ? ScrollViewContainer : ViewContainer;
//   return (
//     <KeyboardAvoidingView style={{ flex: 1 }}>
//       <Container backgroundColor={colors.colorBackground}>
//         <Box flex={1} mb={mbScreenBase} marginHorizontal={marginHorizontalScreenBase} mt={mtScreenBase}>
//           {(buttonLeft || title || buttonRight) && (
//             <Box
//               flexDirection="row"
//               justifyContent="space-between"
//               alignItems="center"
//               mb="b10">
//               <Box flex={1}>{buttonLeft}</Box>

//               <Box alignItems="center" flex={8}>
//                 {title}
//               </Box>

//               <Box flex={1}>{buttonRight}</Box>
//             </Box>
//           )}
//           {children}
//         </Box>
//       </Container>
//     </KeyboardAvoidingView>
//   );
// }
