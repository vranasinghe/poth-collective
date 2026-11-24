import React, { ReactNode, useEffect } from 'react';
import { BrowserTheme } from './BrowserTheme';
import { DialogProvider, installAlertBridge } from './DialogProvider';
import { ToastProvider } from './ToastProvider';

/**
 * Mount once, inside ThemeProvider (and SafeAreaProvider): it provides toasts (`useToast`), dialogs (`useConfirm`,
 * `useDialogs`), web browser-surface theming, and the web `Alert.alert` bridge.
 */
export function UIProvider({ children }: { children: ReactNode }) {
    useEffect(() => {
        installAlertBridge();
    }, []);
    return (
        <ToastProvider>
            <DialogProvider>
                <BrowserTheme />
                {children}
            </DialogProvider>
        </ToastProvider>
    );
}
