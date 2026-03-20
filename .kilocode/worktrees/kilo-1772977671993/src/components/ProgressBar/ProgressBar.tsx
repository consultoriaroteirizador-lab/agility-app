import React from "react";

import { measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";

interface ProgressBarProps {
    consumption: number;
    totalValue: number;
}

export default function ProgressBar({ consumption, totalValue }: ProgressBarProps) {
    function progress(): number {
        if (totalValue === 0) return 0;
        return (consumption / totalValue) * 100;
    }

    return (
        <Box
            width="100%"
            height={measure.y9}
            backgroundColor="gray100"
            borderRadius="s12"
            overflow="hidden"
            justifyContent="center"
        >
            <Box width={`${progress()}%`} backgroundColor="primary100" height={measure.y9} />
        </Box>
    );
}
