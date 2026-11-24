import React, { ReactNode, createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AlertButton, Platform } from 'react-native';
import { Dialog, DialogAction } from '../components/ConfirmationDialog';

export type ConfirmOptions = {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: 'default' | 'danger';
};
export type NoticeOptions = { title: string; message?: string; okLabel?: string };

export type DialogApi = {
    /** Resolves true when confirmed, false when cancelled or dismissed */
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    /** One-button notice. Resolves when closed. */
    notify: (options: NoticeOptions) => Promise<void>;
    /** Low-level: arbitrary actions (used by the Alert bridge) */
    present: (options: { title: string; message?: string; actions: Omit<DialogAction, 'onPress'>[]; dismissable?: boolean }) => Promise<number>;
};

const unavailable = () => { throw new Error('useConfirm/useDialogs must be used inside <UIProvider>'); };
const DialogContext = createContext<DialogApi>({ confirm: unavailable, notify: unavailable, present: unavailable });

/** `const { confirm } = useDialogs(); if (await confirm({ title: 'Delete shop?', tone: 'danger', confirmLabel: 'Delete shop' })) ...` */
export const useDialogs = (): DialogApi => useContext(DialogContext);
export const useConfirm = () => useContext(DialogContext).confirm;

type Request = {
    title: string;
    message?: string;
    actions: Omit<DialogAction, 'onPress'>[];
    dismissable: boolean;
    resolve: (index: number) => void;
};

// Lets non-React code (the Alert bridge) open a dialog through the mounted host
let activePresenter: DialogApi['present'] | null = null;

/**
 * Web's React Native `Alert.alert` is an empty function: every call site silently does nothing there. On web this
 * replaces it with the app's own dialog, so existing screens that call `Alert.alert(title, message, buttons)` show
 * real dialogs and their button callbacks fire. Native platforms are untouched (they already have system alerts).
 */
export const installAlertBridge = () => {
    if (Platform.OS !== 'web') return;
    const bridged = ((title: string, message?: string, buttons?: AlertButton[]) => {
        const list = buttons && buttons.length ? buttons : [{ text: 'OK' } as AlertButton];
        if (!activePresenter) return; // host not mounted yet: nothing sensible to show
        const cancelIndex = list.findIndex((b) => b.style === 'cancel');
        activePresenter({
            title,
            message,
            dismissable: cancelIndex !== -1 || list.length === 1,
            actions: list.map((b) => ({
                label: b.text ?? 'OK',
                tone: b.style === 'cancel' ? 'cancel' : b.style === 'destructive' ? 'danger' : 'primary'
            }))
        }).then((index) => {
            // Dismissing (Escape, scrim) counts as the cancel button when there is one
            const chosen = index >= 0 ? list[index] : cancelIndex !== -1 ? list[cancelIndex] : list[0];
            chosen?.onPress?.();
        });
    }) as typeof Alert.alert;
    (Alert as { alert: typeof Alert.alert }).alert = bridged;
};

export function DialogProvider({ children }: { children: ReactNode }) {
    const [request, setRequest] = useState<Request | null>(null);
    // The ref is the source of truth so queueing and resolving never run inside a state updater (React may call
    // updaters twice, which would resolve a promise or skip a queued dialog twice).
    const current = useRef<Request | null>(null);
    const queue = useRef<Request[]>([]);

    const open = useCallback((req: Request) => {
        if (current.current) {
            queue.current.push(req);
            return;
        }
        current.current = req;
        setRequest(req);
    }, []);

    const close = useCallback((index: number) => {
        const done = current.current;
        if (!done) return;
        done.resolve(index);
        const next = queue.current.shift() ?? null;
        current.current = next;
        setRequest(next);
    }, []);

    const present = useCallback<DialogApi['present']>(
        (o) => new Promise<number>((resolve) => open({ title: o.title, message: o.message, actions: o.actions, dismissable: o.dismissable ?? true, resolve })),
        [open]
    );

    const api = useMemo<DialogApi>(() => ({
        present,
        confirm: async (o) => {
            const index = await present({
                title: o.title,
                message: o.message,
                actions: [
                    { label: o.cancelLabel ?? 'Cancel', tone: 'cancel' },
                    { label: o.confirmLabel ?? 'Confirm', tone: o.tone === 'danger' ? 'danger' : 'primary' }
                ]
            });
            return index === 1;
        },
        notify: async (o) => {
            await present({ title: o.title, message: o.message, actions: [{ label: o.okLabel ?? 'OK', tone: 'primary' }] });
        }
    }), [present]);

    useEffect(() => {
        activePresenter = present;
        return () => { if (activePresenter === present) activePresenter = null; };
    }, [present]);

    return (
        <DialogContext.Provider value={api}>
            {children}
            <Dialog
                visible={!!request}
                title={request?.title ?? ''}
                message={request?.message}
                dismissable={request?.dismissable ?? true}
                onDismiss={() => close(-1)}
                actions={(request?.actions ?? []).map((a, i) => ({ ...a, onPress: () => close(i) }))}
            />
        </DialogContext.Provider>
    );
}
