import { measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";
import { IconButton } from "../Button/IconButton";
import { SliderRef } from "../Slider/Slider";
import { Text } from "../Text/Text";

interface PaginationCarouselChevronProps<T> {
    data: T[];
    activeIndex: number;
    dataRef: React.RefObject<SliderRef | null | undefined>
    onSlideChange?: (index: number) => void;
}

export function PaginationCarouselChevron<T>({ data, activeIndex, dataRef, onSlideChange }: PaginationCarouselChevronProps<T>) {
    function handleGoToSlide(index: number) {
        if (dataRef.current) {
            dataRef.current.goToSlide(index, true);
            // Chamar o callback manualmente já que goToSlide não dispara onSlideChange
            onSlideChange?.(index);
        };
    }
    return (
        <Box height={measure.y30} >
            {data.length > 1 &&
                <Box alignItems='center' justifyContent='center' flexDirection='row'>
                    < IconButton disabled={data.length > 1 && activeIndex === 0} iconName='chevron-left' color={data.length > 1 && activeIndex !== 0 ? 'primary100' : 'gray200'} size={measure.m30} onPress={() => handleGoToSlide(activeIndex - 1)} />
                    <Text preset="text14">{`${activeIndex + 1} de ${data.length}`}</Text>
                    <IconButton disabled={activeIndex === data.length - 1} iconName='chevron-right' color={activeIndex !== data.length - 1 ? 'orangeConlife' : 'gray200'} size={measure.m30} onPress={() => handleGoToSlide(activeIndex + 1)} />
                </Box>}
        </Box>
    )
}