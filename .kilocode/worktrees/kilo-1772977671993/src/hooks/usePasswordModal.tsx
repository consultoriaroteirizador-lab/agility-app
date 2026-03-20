import { useState } from "react";

export function usePasswordModal() {
    const [errorMessage, setErrorMessage] = useState('');
    const [password, setPassword] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    function openPasswordModal() {
        setErrorMessage('');
        setIsVisible(true);
    }

    function closePasswordModal() {
        setPassword('');
        setIsVisible(false);
    }

    return {
        errorMessage,
        setErrorMessage,
        password,
        setPassword,
        isVisible,
        openPasswordModal,
        closePasswordModal,
    };
}
