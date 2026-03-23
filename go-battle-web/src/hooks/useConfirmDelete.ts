import { useState } from 'react';

export function useConfirmDelete<T = number>() {
    const [itemToDelete, setItemToDelete] = useState<T | null>(null);
    const [showModal, setShowModal] = useState(false);

    const confirmDelete = (item: T) => {
        setItemToDelete(item);
        setShowModal(true);
    };

    const cancelDelete = () => {
        setShowModal(false);
        setItemToDelete(null);
    };

    const resetDelete = () => {
        setShowModal(false);
        setItemToDelete(null);
    };

    return { itemToDelete, showModal, confirmDelete, cancelDelete, resetDelete };
}
