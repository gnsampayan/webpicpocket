import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface EmailVerificationContextType {
    isVisible: boolean;
    showEmailVerification: () => void;
    hideEmailVerification: () => void;
    onEmailVerified: () => void;
    setEmailVerifiedCallback: (callback: () => void) => void;
}

const EmailVerificationContext = createContext<EmailVerificationContextType | undefined>(undefined);

interface EmailVerificationProviderProps {
    children: ReactNode;
}

export const EmailVerificationProvider: React.FC<EmailVerificationProviderProps> = ({ children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [emailVerifiedCallback, setEmailVerifiedCallback] = useState<(() => void) | null>(null);

    const showEmailVerification = () => {
        setIsVisible(true);
    };

    const hideEmailVerification = () => {
        setIsVisible(false);
    };

    const onEmailVerified = () => {
        hideEmailVerification();
        if (emailVerifiedCallback) {
            emailVerifiedCallback();
        }
    };

    const setEmailVerifiedCallbackHandler = (callback: () => void) => {
        setEmailVerifiedCallback(() => callback);
    };

    const value: EmailVerificationContextType = {
        isVisible,
        showEmailVerification,
        hideEmailVerification,
        onEmailVerified,
        setEmailVerifiedCallback: setEmailVerifiedCallbackHandler,
    };

    return (
        <EmailVerificationContext.Provider value={value}>
            {children}
        </EmailVerificationContext.Provider>
    );
};

export const useEmailVerification = (): EmailVerificationContextType => {
    const context = useContext(EmailVerificationContext);
    if (context === undefined) {
        throw new Error('useEmailVerification must be used within an EmailVerificationProvider');
    }
    return context;
}; 