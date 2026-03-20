import { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';

interface ScrollViewContainerProps {
  children: ReactNode;
  backgroundColor: string;
}

export function ScrollViewContainer({
  children,
  backgroundColor,
}: ScrollViewContainerProps) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
      contentContainerStyle={{ flexGrow: 1 }}
      style={{ backgroundColor, flex: 1 }}>
      {children}
    </ScrollView>
  );
}

export function ViewContainer({
  children,
  backgroundColor,
}: ScrollViewContainerProps) {
  return <View style={{ backgroundColor, flex: 1 }}>{children}</View>;
}
