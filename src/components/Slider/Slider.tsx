import React, { useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { FlatList, Dimensions, ViewStyle, RefreshControl, NativeSyntheticEvent, NativeScrollEvent, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface SliderRef {
    goToSlide: (index: number, animated?: boolean) => void;
}

interface SliderProps<T> {
    data: T[];
    renderItem: (info: { item: T; index: number }) => React.ReactElement;
    keyExtractor: (item: T, index: number) => string;
    onSlideChange?: (index: number) => void;
    refreshing?: boolean;
    onRefresh?: () => void;
    renderPagination?: (activeIndex: number) => React.ReactElement;
    style?: ViewStyle;
    initialIndex?: number;
}

function SliderInner<T>(
    {
        data,
        renderItem,
        keyExtractor,
        onSlideChange,
        refreshing = false,
        onRefresh,
        renderPagination,
        style,
        initialIndex = 0,
    }: SliderProps<T>,
    ref: React.Ref<SliderRef>
) {
    const flatListRef = useRef<FlatList<T>>(null);
    const [activeIndex, setActiveIndex] = useState(initialIndex);
    const isProgrammaticScroll = useRef(false);

    useImperativeHandle(ref, () => ({
        goToSlide: (index: number, animated: boolean = true) => {
            if (index >= 0 && index < data.length && index !== activeIndex) {
                isProgrammaticScroll.current = true;
                setActiveIndex(index);
                onSlideChange?.(index);
                flatListRef.current?.scrollToIndex({ index, animated });
                
                setTimeout(() => {
                    isProgrammaticScroll.current = false;
                }, animated ? 350 : 50);
            }
        },
    }));

    const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        if (isProgrammaticScroll.current) {
            return;
        }
        
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        
        if (index !== activeIndex && index >= 0 && index < data.length) {
            setActiveIndex(index);
            onSlideChange?.(index);
        }
    }, [activeIndex, data.length, onSlideChange]);

    const getItemLayout = useCallback((_: ArrayLike<T> | null | undefined, index: number) => ({
        length: SCREEN_WIDTH,
        offset: SCREEN_WIDTH * index,
        index,
    }), []);

    const renderItemWrapper = useCallback(({ item, index }: { item: T; index: number }) => {
        return (
            <View style={{ width: SCREEN_WIDTH }}>
                {renderItem({ item, index })}
            </View>
        );
    }, [renderItem]);

    return (
        <>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderItemWrapper}
                keyExtractor={keyExtractor}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                refreshControl={
                    onRefresh ? (
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    ) : undefined
                }
                getItemLayout={getItemLayout}
                initialScrollIndex={initialIndex}
                style={style}
                bounces={false}
                decelerationRate="fast"
                snapToInterval={SCREEN_WIDTH}
                snapToAlignment="start"
            />
            {renderPagination && renderPagination(activeIndex)}
        </>
    );
}

export const Slider = forwardRef(SliderInner) as <T>(
    props: SliderProps<T> & { ref?: React.Ref<SliderRef> }
) => React.ReactElement;

