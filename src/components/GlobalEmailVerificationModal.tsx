import React from 'react';
import { useEmailVerification } from '../context/EmailVerificationContext';
import EmailVerificationModal from './EmailVerificationModal';

const GlobalEmailVerificationModal: React.FC = () => {
    const { isVisible, hideEmailVerification, onEmailVerified } = useEmailVerification();

    return (
        <EmailVerificationModal
            isVisible={isVisible}
            onClose={hideEmailVerification}
            onEmailVerified={onEmailVerified}
        />
    );
};

export default GlobalEmailVerificationModal; 