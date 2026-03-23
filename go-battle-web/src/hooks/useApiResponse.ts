import { useState } from 'react';

export function useApiResponse() {
    const [hasError, setHasError] = useState(false);
    const [hasWarning, setHasWarning] = useState(false);
    const [showResponse, setShowResponse] = useState(false);
    const [alertText, setAlertText] = useState('');

    const handleResponse = async (response: Response) => {
        setShowResponse(true);
        const responseText = await response.text();
        setAlertText(`HTTP ${response.status}: ${responseText}`);

        if (response.ok) {
            setHasWarning(false);
            setHasError(false);
        } else if (response.status === 400) {
            setHasWarning(true);
        } else if (response.status === 500) {
            console.error(responseText);
            setHasError(true);
            return Promise.reject();
        }
    };

    const alertVariant = hasError ? 'danger' : hasWarning ? 'warning' : 'success';

    return { hasError, hasWarning, showResponse, setShowResponse, alertText, setAlertText, handleResponse, alertVariant };
}
