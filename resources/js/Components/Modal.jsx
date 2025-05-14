import React from 'react';
import {
    Dialog,
    DialogPanel,
    Transition,
    TransitionChild,
} from '@headlessui/react';
export default function Modal({
    children,
    show = false,
    maxWidth = '2xl',
    closeable = true,
    staticBackdrop = false, 
    onClose = () => {},
}) {
    
    React.useEffect(() => {
    }, [show]);
    const close = (e) => {
        
        if (staticBackdrop && e?.type === 'click') {
            e.preventDefault();
            return;
        }
        if (closeable) {
            onClose();
        }
    };
    const maxWidthClass = {
        sm: 'sm:max-w-sm',
        md: 'sm:max-w-md',
        lg: 'sm:max-w-lg',
        xl: 'sm:max-w-xl',
        '2xl': 'sm:max-w-2xl',
    }[maxWidth];
    return (
        <Transition show={show} leave="duration-200">
            <Dialog
                as="div"
                id="modal"
                className="fixed inset-0 flex transform items-center overflow-y-auto px-4 py-6 transition-all sm:px-0"
                style={{
                    display: 'flex !important',
                    visibility: 'visible !important',
                    opacity: 1,
                    pointerEvents: 'auto',
                    zIndex: 9999,
                    position: 'fixed'
                }}
                onClick={(e) => {
                    
                    e.stopPropagation();
                }}
                onClose={close}
            >
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="absolute inset-0 bg-gray-500/75" />
                </TransitionChild>
                <TransitionChild
                    enter="ease-out duration-300"
                    enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                    enterTo="opacity-100 translate-y-0 sm:scale-100"
                    leave="ease-in duration-200"
                    leaveFrom="opacity-100 translate-y-0 sm:scale-100"
                    leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
                >
                    <DialogPanel
                        className={`mb-6 transform overflow-hidden rounded-lg bg-white shadow-xl transition-all sm:mx-auto sm:w-full ${maxWidthClass}`}
                        style={{
                            pointerEvents: 'auto',
                            position: 'relative',
                            zIndex: 10000
                        }}
                        onClick={(e) => {
                            
                            e.stopPropagation();
                            
                            if (staticBackdrop) {
                                e.preventDefault();
                            }
                        }}
                    >
                        {children}
                    </DialogPanel>
                </TransitionChild>
            </Dialog>
        </Transition>
    );
}
