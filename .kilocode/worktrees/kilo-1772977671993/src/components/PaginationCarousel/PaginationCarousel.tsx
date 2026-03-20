import { measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";
import { TextButton } from "../Button";
import { SliderRef } from "../Slider/Slider";

interface PaginationCarouselProps<T> {
    data: T[];
    activeIndex: number;
    dataRef: React.RefObject<SliderRef>
}

export function PaginationCarousel<T>({ data, activeIndex, dataRef }: PaginationCarouselProps<T>) {
    function handleGoToSlide(index: number) {
        if (dataRef.current) {
            dataRef.current.goToSlide(index, true);
        };
    }
    return (
        <Box height={measure.y20} alignItems='center' justifyContent='center' flexDirection='row'>
            {data.length > 1 &&
                data.map((_, i) => (
                    <TextButton key={i} onPress={() => handleGoToSlide(i)} preset='TextWhite' title='' backgroundColor={activeIndex === i ? 'primary100' : 'blackOpaque'} width={activeIndex === i ? measure.m30 : measure.m10} height={measure.m10} borderRadius='s6' marginHorizontal='x4' />
                ))
            }
        </Box>
    )
}