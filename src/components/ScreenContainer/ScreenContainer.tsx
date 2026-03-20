import { ReactNode } from 'react';
import { Platform, ScrollView, View } from 'react-native';

import { ScrollViewProvider } from '@/components/ScrollViewContext';

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
      style={{ backgroundColor, flex: 1 }}
      nestedScrollEnabled={true}
      scrollEventThrottle={16}
      removeClippedSubviews={Platform.OS === 'android'}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}>
      <ScrollViewProvider>{children}</ScrollViewProvider>
    </ScrollView>
  );
}

export function ViewContainer({
  children,
  backgroundColor,
}: ScrollViewContainerProps) {
  return <View style={{ backgroundColor, flex: 1 }}>{children}</View>;
}
