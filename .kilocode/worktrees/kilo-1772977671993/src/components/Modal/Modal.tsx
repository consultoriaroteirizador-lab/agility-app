import React, { ReactElement } from 'react';

import { Box } from '../BoxBackGround/BoxBackGround';
import { Button } from '../Button';
import ModalComponent from '../ModalComponent/ModalComponent';
import { Text } from '../Text/Text';

type ModalPreset = 'action' | 'info'

interface ModalProps {
    children?: ReactElement,
    buttonCloseTitle?: string;
    buttonActionTitle?: string;
    preset?: ModalPreset
    title: string;
    text?: string;
    isVisible: boolean;
    onPress?: () => void;
    onClose: () => void;
}


export default function Modal({children, title, text, preset, onPress, onClose, isVisible, buttonActionTitle = 'Continuar', buttonCloseTitle = 'Fechar' }: ModalProps) {

    function renderModal() {
        switch (preset) {
            case 'info': return modalInfo(title, text!, onClose);
            case 'action': return modalAction(buttonActionTitle, buttonCloseTitle, title, text!, onPress!, onClose)
        }
    }

    if (!isVisible) {
        return null
    }

    return (
        <ModalComponent>
            {renderModal() ?? children}
        </ModalComponent>
    );
}

const modalAction = (buttonActionTitle: string, buttonCloseTitle: string, title: string, text: string, onPress: () => void, onClose: () => void) => {
    return (
        <Box paddingVertical='y14' paddingHorizontal='x10' alignItems='center'>
            <Box alignItems='center'>
                <Text color='primary100' fontWeightPreset='semibold'>{title}</Text>
            </Box>
            <Box alignItems='center' justifyContent='center' pb='b32' pt='t18'>
                <Text>{text}</Text>
            </Box>
            <Box gap='y10'>
                <Button title={buttonActionTitle} onPress={onPress} />
                <Button preset='outline' title={buttonCloseTitle} onPress={onClose} />
            </Box>
        </Box>
    )
}

const modalInfo = (title: string, text: string, onClose: () => void) => {
    return (
        <Box paddingVertical='y14' paddingHorizontal='x10' alignItems='center'>
            <Box alignItems='center'>
                <Text color='primary100' fontWeightPreset='semibold'>{title}</Text>
            </Box>
            <Box alignItems='center' justifyContent='center' pb='b32' pt='t18'>
                <Text>{text}</Text>
            </Box>
            <Box gap='y10'>
                <Button title='Fechar' onPress={onClose} />
            </Box>
        </Box>
    )
}

