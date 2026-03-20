
import { useEffect, useState } from "react";

import { measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";
import { Icon } from "../Icon/Icon";

import KeyboardItem from "./components/KeyboardItem";
interface KeyboardProps {
    setInputValue: (value: string) => void;
    currentValue: string,
    confirmAction: () => void;
    maxLength?: number;
}
export default function Keyboard({ setInputValue, currentValue, confirmAction, maxLength }: KeyboardProps) {
    const [isMaxLength, setIsMaxLength] = useState(false);

    function handleKeyPress(value: string | number) {
        if (value === "delete") {
            setInputValue(currentValue.slice(0, -1));
        } else {
            if (maxLength) {
                if (currentValue.length < maxLength) {
                    setInputValue(currentValue + value.toString());
                }
            } else {
                setInputValue(currentValue + value.toString());
            }

        }
    }

    useEffect(() => {
        if (maxLength) {
            if (currentValue.length === maxLength && !isMaxLength) {
                setIsMaxLength(true);
                confirmAction();
            } else if (currentValue.length < maxLength && isMaxLength) {
                setIsMaxLength(false);
            }
        }
    }, [currentValue, maxLength, confirmAction, isMaxLength]);



    return (
        <Box width={"100%"} justifyContent="space-around" height={measure.y300}>
            <Box flexDirection="row" justifyContent="space-around" alignItems="center">
                <KeyboardItem value={1} onPress={() => handleKeyPress(1)} />
                <KeyboardItem value={2} onPress={() => handleKeyPress(2)} />
                <KeyboardItem value={3} onPress={() => handleKeyPress(3)} />
            </Box>
            <Box flexDirection="row" justifyContent="space-around" alignItems="center">
                <KeyboardItem value={4} onPress={() => handleKeyPress(4)} />
                <KeyboardItem value={5} onPress={() => handleKeyPress(5)} />
                <KeyboardItem value={6} onPress={() => handleKeyPress(6)} />
            </Box>
            <Box flexDirection="row" justifyContent="space-around" alignItems="center">
                <KeyboardItem value={7} onPress={() => handleKeyPress(7)} />
                <KeyboardItem value={8} onPress={() => handleKeyPress(8)} />
                <KeyboardItem value={9} onPress={() => handleKeyPress(9)} />
            </Box>
            <Box flexDirection="row" justifyContent="space-around" alignItems="center">
                <Box flex={1} />
                <KeyboardItem flex={1} value={0} onPress={() => handleKeyPress(0)} />
                <KeyboardItem flex={1} value={<Icon name="backspace" color="gray600" size={measure.x24} />} onPress={() => handleKeyPress("delete")} />
            </Box>
        </Box>
    )
}


