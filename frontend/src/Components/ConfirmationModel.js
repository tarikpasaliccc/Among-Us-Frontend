import React from 'react';

const ConfirmationModal = ({ isOpen, onConfirm, onCancel, message }) => {
    if (!isOpen) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ padding: 20, background: '#fff', borderRadius: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <p>{message}</p>
                <button onClick={onConfirm} style={{ margin: 10 }}>Yes</button>
                <button onClick={onCancel} style={{ margin: 10 }}>No</button>
            </div>
        </div>
    );
};

export default ConfirmationModal;
