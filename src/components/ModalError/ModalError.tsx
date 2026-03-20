import { useModalError, useModalErrorService } from "@/services/modalError/useModalErrorService";

import { Box } from "../BoxBackGround/BoxBackGround";
import { Button } from "../Button";
import ModalComponent from "../ModalComponent/ModalComponent";
import { Text } from "../Text/Text";



export function ModalError() {

    const { isVisible, errorMessage } = useModalError()
    const { onClose } = useModalErrorService()

    if (!isVisible) {
        return null
    }

    return (
        <ModalComponent 
            backgroundColor="white" 
        >
            <Box paddingVertical='y14' paddingHorizontal='x10' alignItems='center'>
                <Box alignItems='center'>
                    <Text color='primary100' fontWeightPreset='semibold'>{"Houve um erro"}</Text>
                </Box>
                <Box alignItems='center' justifyContent='center' pb='b32' pt='t18'>
                    <Text>{errorMessage}</Text>
                </Box>
                <Box gap='y10'>
                    <Button title='Fechar' onPress={onClose} />
                </Box>
            </Box>
        </ModalComponent>
    )
}