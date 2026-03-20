import { useState } from "react"

export function useModal() {

    const [modalIsVisible, setModalIsVisible] = useState(false)

    function onClose() {
        setModalIsVisible(false)
    }

    function onOpen() {
        setModalIsVisible(true)
    }
    return {
        modalIsVisible, onClose, onOpen
    }
}