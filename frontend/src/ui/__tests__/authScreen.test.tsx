import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import AuthScreen from '../../../app/auth';
import { createDemoUserAPI, loginUserAPI, registerUserAPI } from '../../api/userApi';
import { AuthContext } from '../../context/AuthContext';
import { auditAccessibility, renderUI } from './testUtils';

jest.mock('axios', () => ({ __esModule: true, default: { get: jest.fn(), interceptors: { response: { use: jest.fn(), eject: jest.fn() } } } }));
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace, push: jest.fn(), back: jest.fn(), canGoBack: () => false }),
}));
jest.mock('@react-native-async-storage/async-storage', () => jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'));
jest.mock('../../api/userApi', () => ({
    loginUserAPI: jest.fn(),
    registerUserAPI: jest.fn(),
    createDemoUserAPI: jest.fn(),
}));


const loginContext = jest.fn().mockResolvedValue(undefined);
const mounted = () =>
    renderUI(
        <AuthContext.Provider value={{ user: null, isLoading: false, loginContext, logoutContext: jest.fn(), updateUserContext: jest.fn() }}>
            <AuthScreen />
        </AuthContext.Provider>
    );

const type = async (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
const press = async (name: string | RegExp) => fireEvent.press(screen.getByRole('button', { name }));

beforeEach(() => {
    jest.clearAllMocks();
    loginContext.mockResolvedValue(undefined);
});

describe('sign in', () => {
    test('shows the login form, the demo entry points, and no inert controls', async () => {
        await mounted();
        expect(screen.getByText('Welcome back')).toBeTruthy();
        expect(screen.getByLabelText('Email address')).toBeTruthy();
        expect(screen.getByLabelText('Password')).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Log in' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Explore as a reader' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'Explore as a shop owner' })).toBeTruthy();
        // The previous screen rendered buttons that did nothing; they must not come back
        expect(screen.queryByText(/google|apple|forgot password/i)).toBeNull();
        expect(screen.queryByLabelText(/google|apple|forgot/i)).toBeNull();
    });

    test('submitting empty shows inline errors and a toast, and calls no API', async () => {
        await mounted();
        await press('Log in');
        expect(screen.getByText('Email is required')).toBeTruthy();
        expect(screen.getByText('Password is required')).toBeTruthy();
        expect(screen.getByText('Please fix the highlighted fields and try again.')).toBeTruthy();
        expect(loginUserAPI).not.toHaveBeenCalled();
    });

    test('an invalid email is explained and fixing it clears the message', async () => {
        await mounted();
        await type('Email address', 'nope');
        await type('Password', 'whatever1');
        await press('Log in');
        expect(screen.getByText(/valid email address/)).toBeTruthy();
        await type('Email address', 'nimal@example.com');
        expect(screen.queryByText(/valid email address/)).toBeNull();
    });

    test.each([
        ['Customer', '/(tabs)/dashboard'],
        ['Shop Owner', '/owner'],
    ])('a successful %s login stores the session and routes by role', async (userType, route) => {
        (loginUserAPI as jest.Mock).mockResolvedValue({ data: { _id: '1', firstName: 'Nimal', userType, token: 'jwt' } });
        await mounted();
        await type('Email address', '  Nimal@Example.com ');
        await type('Password', 'Sup3rSecret99');
        await press('Log in');
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(route));
        expect(loginUserAPI).toHaveBeenCalledWith({ email: 'Nimal@Example.com', password: 'Sup3rSecret99' });
        expect(loginContext).toHaveBeenCalledWith(expect.objectContaining({ token: 'jwt', userType }));
        expect(screen.getByText('Welcome back, Nimal.')).toBeTruthy();
    });

    test('a server rejection is shown to the user (visibly, on every platform) and nothing navigates', async () => {
        (loginUserAPI as jest.Mock).mockRejectedValue({ response: { status: 401, data: { message: 'Invalid credentials' } } });
        await mounted();
        await type('Email address', 'nimal@example.com');
        await type('Password', 'WrongPass1');
        await press('Log in');
        expect(await screen.findByText('Invalid credentials')).toBeTruthy();
        expect(mockReplace).not.toHaveBeenCalled();
        expect(loginContext).not.toHaveBeenCalled();
        // the form is usable again for another attempt
        expect(screen.getByRole('button', { name: 'Log in' })).not.toBeDisabled();
    });

    test('an unreachable server gets a plain-language message, not a silent failure', async () => {
        (loginUserAPI as jest.Mock).mockRejectedValue(new Error('Network Error'));
        await mounted();
        await type('Email address', 'nimal@example.com');
        await type('Password', 'Sup3rSecret99');
        await press('Log in');
        expect(await screen.findByText(/couldn't reach the server/)).toBeTruthy();
    });

    test('the button shows a pending state and blocks a second submit while the request runs', async () => {
        let resolve: (v: unknown) => void = () => {};
        (loginUserAPI as jest.Mock).mockReturnValue(new Promise((r) => { resolve = r; }));
        await mounted();
        await type('Email address', 'nimal@example.com');
        await type('Password', 'Sup3rSecret99');
        // Not awaited: the handler stays pending until we resolve the request below
        const firstPress = fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
        await waitFor(() => expect(screen.getByRole('button', { name: 'Log in' })).toBeBusy());
        await fireEvent.press(screen.getByRole('button', { name: 'Log in' }));
        expect(loginUserAPI).toHaveBeenCalledTimes(1);
        resolve({ data: { _id: '1', firstName: 'N', userType: 'Customer', token: 't' } });
        await firstPress;
        await waitFor(() => expect(mockReplace).toHaveBeenCalled());
    });
});

describe('demo access', () => {
    test.each([
        ['Explore as a reader', 'Customer', '/(tabs)/dashboard'],
        ['Explore as a shop owner', 'Shop Owner', '/owner'],
    ])('%s creates a demo account and routes by role', async (label, type_, route) => {
        (createDemoUserAPI as jest.Mock).mockResolvedValue({ data: { _id: 'd', firstName: 'Demo', userType: type_, token: 'demo-jwt', isDemo: true } });
        await mounted();
        await press(label);
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith(route));
        expect(createDemoUserAPI).toHaveBeenCalledWith(type_);
        expect(loginContext).toHaveBeenCalledWith(expect.objectContaining({ isDemo: true }));
    });

    test('a demo failure is reported', async () => {
        (createDemoUserAPI as jest.Mock).mockRejectedValue({ response: { status: 503, data: { message: 'Demo accounts are temporarily unavailable' } } });
        await mounted();
        await press('Explore as a reader');
        expect(await screen.findByText('Demo accounts are temporarily unavailable')).toBeTruthy();
    });
});

describe('sign up', () => {
    const toRegister = async () => {
        await mounted();
        await press('Create an account');
    };

    test('switching shows the role selector, the extra fields and the password checklist', async () => {
        await toRegister();
        expect(screen.getByText('Join the library')).toBeTruthy();
        expect(screen.getByRole('radio', { name: /Reader/ })).toBeChecked();
        for (const label of ['First name', 'Last name', 'Nearest city', 'Phone number']) expect(screen.getByLabelText(label)).toBeTruthy();
        await type('Password', 'abc');
        expect(screen.getByLabelText('At least 9 characters: not met yet')).toBeTruthy();
        expect(screen.queryByText(/Explore as/)).toBeNull(); // demo options belong to the login view
    });

    test('phone input keeps digits only', async () => {
        await toRegister();
        await type('Phone number', '077-123 4567');
        expect(screen.getByLabelText('Phone number').props.value).toBe('0771234567');
    });

    test('submits the same payload shape the API expects, with the chosen role', async () => {
        (registerUserAPI as jest.Mock).mockResolvedValue({ data: { _id: '9', firstName: 'Kamal', userType: 'Shop Owner', token: 'jwt' } });
        await toRegister();
        await fireEvent.press(screen.getByRole('radio', { name: /Shop owner/ }));
        await type('First name', ' Kamal ');
        await type('Last name', 'Silva');
        await type('Nearest city', 'Kandy');
        await type('Phone number', '0771234567');
        await type('Email address', 'kamal@example.com');
        await type('Password', 'Sup3rSecret99');
        await press('Create account');
        await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/owner'));
        expect(registerUserAPI).toHaveBeenCalledWith({
            firstName: 'Kamal', lastName: 'Silva', email: 'kamal@example.com', password: 'Sup3rSecret99',
            userType: 'Shop Owner', nearestCity: 'Kandy', phoneNumber: '0771234567',
        });
    });

    test('weak password and bad phone block submission with specific messages', async () => {
        await toRegister();
        await type('First name', 'Kamal');
        await type('Nearest city', 'Kandy');
        await type('Phone number', '0771');
        await type('Email address', 'kamal@example.com');
        await type('Password', 'short');
        await press('Create account');
        expect(registerUserAPI).not.toHaveBeenCalled();
        expect(screen.getByText(/exactly 10 digits/)).toBeTruthy();
    });

    test('an email that is already registered is shown on the email field', async () => {
        (registerUserAPI as jest.Mock).mockRejectedValue({ response: { status: 409, data: { message: 'User exists' } } });
        await toRegister();
        await type('First name', 'Kamal');
        await type('Nearest city', 'Kandy');
        await type('Phone number', '0771234567');
        await type('Email address', 'kamal@example.com');
        await type('Password', 'Sup3rSecret99');
        await press('Create account');
        expect(await screen.findByText(/already exists/)).toBeTruthy();
    });

    test('no control on either view is missing an accessible name', async () => {
        await mounted();
        expect(auditAccessibility()).toEqual([]);
        await press('Create an account');
        expect(auditAccessibility()).toEqual([]);
    });
});
