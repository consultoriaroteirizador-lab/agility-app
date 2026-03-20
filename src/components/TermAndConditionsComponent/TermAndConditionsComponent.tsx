
import { goTermAndConditionsScreen } from "@/routes/routesService";
import { colors, measure } from "@/theme";

import { Box } from "../BoxBackGround/BoxBackGround";
import Checkbox from "../CheckboxBox/CheckboxBox";
import { Text } from "../Text/Text";

interface TermAndConditionsComponentProps {
    text: string;
    onCheckedChange: (termsAccepted: boolean) => void;
    termsAccepted: boolean
}

export function TermAndConditionsComponent({
    text,
    termsAccepted = false,
    onCheckedChange,
}: TermAndConditionsComponentProps) {

    const handleCheckboxChange = () => {
        onCheckedChange(!termsAccepted);
    };

    function handleGoTermAndConditionsScreen() {
        onCheckedChange(true)
        goTermAndConditionsScreen();
    }

    return (
        <Box flexDirection="row" alignItems="flex-start" gap="x12" pr="r10" >
            <Checkbox
                alignItems="center"
                width={measure.x20}
                fillColor={colors.primary100}
                size={measure.x18}
                isChecked={termsAccepted}
                onPress={handleCheckboxChange}
            />
            <Text color="gray600" textAlign="justify" preset="textParagraphSmall" style={{ flexShrink: 1 }}>
                Declaro que li e concordo com os {<Text onPress={handleGoTermAndConditionsScreen} textAlign="justify" preset="textParagraphSmall" fontWeightPreset="bold" textDecorationLine="underline" color="primary100" > termos e condições </Text>} {text}
            </Text>
        </Box>
    );
}
