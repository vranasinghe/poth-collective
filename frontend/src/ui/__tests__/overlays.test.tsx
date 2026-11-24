import React, { useState } from 'react';
import { AccessibilityInfo, Alert, Platform, Text } from 'react-native';
import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';
import {
    BottomSheet, ConfirmationDialog, PrimaryButton, SecondaryButton, useConfirm, useDialogs, useReducedMotion, useToast,
} from '../index';
import { auditAccessibility, renderUI } from './testUtils';

describe('Toast', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    const Trigger = ({ tone = 'success', action }: { tone?: 'success' | 'error' | 'info' | 'warning'; action?: boolean }) => {
        const toast = useToast();
        return (
            <PrimaryButton
                title="Notify"
                onPress={() => toast.show({ message: `A ${tone} message`, tone, action: action ? { label: 'Undo', onPress: onUndo } : undefined })}
            />
        );
    };
    const onUndo = jest.fn();

    test('shows a message and dismisses itself after the default duration', async () => {
        await renderUI(<Trigger />);
        await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
        expect(screen.getByText('A success message')).toBeTruthy();
        await act(async () => { jest.advanceTimersByTime(3900); });
        expect(screen.queryByText('A success message')).toBeTruthy();
        await act(async () => { jest.advanceTimersByTime(300); });
        expect(screen.queryByText('A success message')).toBeNull();
    });

    test('errors stay longer than other messages', async () => {
        await renderUI(<Trigger tone="error" />);
        await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
        await act(async () => { jest.advanceTimersByTime(4500); });
        expect(screen.getByText('A error message')).toBeTruthy();
        await act(async () => { jest.advanceTimersByTime(1700); });
        expect(screen.queryByText('A error message')).toBeNull();
    });

    test('can be dismissed by hand, and the close control is named', async () => {
        await renderUI(<Trigger />);
        await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(screen.queryByText('A success message')).toBeNull();
    });

    test('an action runs and closes the toast', async () => {
        await renderUI(<Trigger action />);
        await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
        expect(onUndo).toHaveBeenCalled();
        expect(screen.queryByText('A success message')).toBeNull();
    });

    test('keeps at most three toasts on screen', async () => {
        function Many() {
            const toast = useToast();
            return <PrimaryButton title="Spam" onPress={() => { for (let i = 1; i <= 5; i += 1) toast.info(`Message ${i}`, { duration: 0 }); }} />;
        }
        await renderUI(<Many />);
        await fireEvent.press(screen.getByRole('button', { name: 'Spam' }));
        expect(screen.queryByText('Message 1')).toBeNull();
        expect(screen.queryByText('Message 2')).toBeNull();
        expect(screen.getByText('Message 3')).toBeTruthy();
        expect(screen.getByText('Message 5')).toBeTruthy();
    });

    test('toast controls pass the accessibility audit', async () => {
        await renderUI(<Trigger action />);
        await fireEvent.press(screen.getByRole('button', { name: 'Notify' }));
        expect(auditAccessibility()).toEqual([]);
    });
});

describe('ConfirmationDialog', () => {
    test('shows title, message and named buttons; confirm and cancel call back', async () => {
        const onConfirm = jest.fn();
        const onCancel = jest.fn();
        await renderUI(<ConfirmationDialog visible title="Delete this shop?" message="Order history is kept." confirmLabel="Delete shop" tone="danger" onConfirm={onConfirm} onCancel={onCancel} />);
        expect(screen.getByText('Delete this shop?')).toBeTruthy();
        expect(screen.getByText('Order history is kept.')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Delete shop' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('renders nothing when not visible', async () => {
        await renderUI(<ConfirmationDialog visible={false} title="Hidden" onConfirm={() => {}} onCancel={() => {}} />);
        expect(screen.queryByText('Hidden')).toBeNull();
    });

    test('pending confirm is busy and the dialog cannot be dismissed while it runs', async () => {
        const onCancel = jest.fn();
        await renderUI(<ConfirmationDialog visible loading title="Deleting" confirmLabel="Delete" onConfirm={() => {}} onCancel={onCancel} />);
        expect(screen.getByRole('button', { name: 'Delete' })).toBeBusy();
        await fireEvent.press(screen.getByRole('button', { name: 'Dismiss dialog', hidden: true }));
        expect(onCancel).not.toHaveBeenCalled();
    });

    test('scrim press cancels a normal dialog', async () => {
        const onCancel = jest.fn();
        await renderUI(<ConfirmationDialog visible title="Sure?" onConfirm={() => {}} onCancel={onCancel} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Dismiss dialog', hidden: true }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});

describe('useConfirm / useDialogs', () => {
    function Harness() {
        const confirm = useConfirm();
        const { notify } = useDialogs();
        const [result, setResult] = useState('none');
        return (
            <>
                <PrimaryButton title="Ask" onPress={() => { confirm({ title: 'Cancel order?', confirmLabel: 'Cancel order', cancelLabel: 'Keep order', tone: 'danger' }).then((ok) => setResult(ok ? 'yes' : 'no')); }} />
                <PrimaryButton title="Tell" onPress={() => { notify({ title: 'Saved' }).then(() => setResult('notified')); }} />
                <Text testID="result">{result}</Text>
            </>
        );
    }

    test('resolves true on confirm and false on cancel', async () => {
        await renderUI(<Harness />);
        await fireEvent.press(screen.getByRole('button', { name: 'Ask' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel order' }));
        expect(screen.getByTestId('result')).toHaveTextContent('yes');

        await fireEvent.press(screen.getByRole('button', { name: 'Ask' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Keep order' }));
        expect(screen.getByTestId('result')).toHaveTextContent('no');
    });

    test('resolves false when dismissed from the scrim', async () => {
        await renderUI(<Harness />);
        await fireEvent.press(screen.getByRole('button', { name: 'Ask' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Dismiss dialog', hidden: true }));
        expect(screen.getByTestId('result')).toHaveTextContent('no');
    });

    test('notify shows a single OK button', async () => {
        await renderUI(<Harness />);
        await fireEvent.press(screen.getByRole('button', { name: 'Tell' }));
        expect(screen.getByText('Saved')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
        expect(screen.getByTestId('result')).toHaveTextContent('notified');
    });

    test('two dialogs requested at once are shown one after the other, none lost', async () => {
        function Two() {
            const confirm = useConfirm();
            const [log, setLog] = useState('');
            return (
                <>
                    <PrimaryButton title="Both" onPress={() => {
                        confirm({ title: 'First' }).then((v) => setLog((l) => `${l}A:${v};`));
                        confirm({ title: 'Second' }).then((v) => setLog((l) => `${l}B:${v};`));
                    }} />
                    <Text testID="log">{log}</Text>
                </>
            );
        }
        await renderUI(<Two />);
        await fireEvent.press(screen.getByRole('button', { name: 'Both' }));
        expect(screen.getByText('First')).toBeTruthy();
        expect(screen.queryByText('Second')).toBeNull();
        await fireEvent.press(screen.getByRole('button', { name: 'Confirm' }));
        expect(screen.getByText('Second')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Cancel' }));
        expect(screen.getByTestId('log')).toHaveTextContent('A:true;B:false;');
    });
});

describe('web Alert.alert bridge', () => {
    const originalAlert = Alert.alert;
    afterEach(() => {
        (Alert as { alert: typeof Alert.alert }).alert = originalAlert;
        jest.restoreAllMocks();
    });

    test('on web, Alert.alert shows a real dialog and runs the pressed button callback', async () => {
        jest.replaceProperty(Platform, 'OS', 'web');
        const onDelete = jest.fn();
        const onCancel = jest.fn();
        await renderUI(<Text>host</Text>);

        await act(async () => {
            Alert.alert('Delete Blog', 'Are you sure you want to delete this blog?', [
                { text: 'Cancel', style: 'cancel', onPress: onCancel },
                { text: 'Delete', style: 'destructive', onPress: onDelete },
            ]);
        });
        expect(screen.getByText('Delete Blog')).toBeTruthy();
        expect(screen.getByText('Are you sure you want to delete this blog?')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Delete' }));
        expect(onDelete).toHaveBeenCalledTimes(1);
        expect(onCancel).not.toHaveBeenCalled();
        expect(screen.queryByText('Delete Blog')).toBeNull();
    });

    test('dismissing from the scrim counts as the cancel button', async () => {
        jest.replaceProperty(Platform, 'OS', 'web');
        const onCancel = jest.fn();
        await renderUI(<Text>host</Text>);
        await act(async () => { Alert.alert('Remove?', undefined, [{ text: 'No', style: 'cancel', onPress: onCancel }, { text: 'Yes' }]); });
        await fireEvent.press(screen.getByRole('button', { name: 'Dismiss dialog', hidden: true }));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('a bare alert (message only) gets one OK button that closes it', async () => {
        jest.replaceProperty(Platform, 'OS', 'web');
        await renderUI(<Text>host</Text>);
        await act(async () => { Alert.alert('Review submitted!'); });
        expect(screen.getByText('Review submitted!')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
        expect(screen.queryByText('Review submitted!')).toBeNull();
    });

    test('a button that navigates (as register-shop does) still runs after OK', async () => {
        jest.replaceProperty(Platform, 'OS', 'web');
        const navigate = jest.fn();
        await renderUI(<Text>host</Text>);
        await act(async () => { Alert.alert('Success', 'Shop registered!', [{ text: 'OK', onPress: navigate }]); });
        await fireEvent.press(screen.getByRole('button', { name: 'OK' }));
        expect(navigate).toHaveBeenCalledTimes(1);
    });

    test('on native platforms the system Alert is left untouched', async () => {
        jest.replaceProperty(Platform, 'OS', 'ios');
        await renderUI(<Text>host</Text>);
        expect(Alert.alert).toBe(originalAlert);
    });
});

describe('BottomSheet', () => {
    test('shows its title and content, and closes from the close button', async () => {
        const onClose = jest.fn();
        await renderUI(<BottomSheet visible onClose={onClose} title="Filter books"><SecondaryButton title="Apply" onPress={() => {}} /></BottomSheet>);
        expect(screen.getByText('Filter books')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Apply' })).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('scrim press closes it unless it is not dismissable', async () => {
        const onClose = jest.fn();
        const view = await renderUI(<BottomSheet visible onClose={onClose} title="Sheet"><Text>x</Text></BottomSheet>);
        await fireEvent.press(screen.getByRole('button', { name: 'Close sheet', hidden: true }));
        expect(onClose).toHaveBeenCalledTimes(1);

        await view.rerender(<BottomSheet visible onClose={onClose} title="Sheet" dismissable={false}><Text>x</Text></BottomSheet>);
        await fireEvent.press(screen.getByRole('button', { name: 'Close sheet', hidden: true }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('is absent when not visible', async () => {
        await renderUI(<BottomSheet visible={false} onClose={() => {}} title="Hidden"><Text>x</Text></BottomSheet>);
        expect(screen.queryByText('Hidden')).toBeNull();
    });
});

describe('useReducedMotion', () => {
    test('follows the system accessibility setting', async () => {
        const remove = jest.fn();
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
        jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove } as never);
        const { result, unmount } = await renderHook(() => useReducedMotion());
        await act(async () => { await Promise.resolve(); });
        expect(result.current).toBe(true);
        await unmount();
        expect(remove).toHaveBeenCalled();
    });

    test('defaults to false when the setting is off', async () => {
        jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
        jest.spyOn(AccessibilityInfo, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
        const { result } = await renderHook(() => useReducedMotion());
        await act(async () => { await Promise.resolve(); });
        expect(result.current).toBe(false);
    });
});
