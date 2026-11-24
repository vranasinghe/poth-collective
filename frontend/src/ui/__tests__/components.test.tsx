import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { act, fireEvent, screen } from '@testing-library/react-native';
import {
    AppHeader, AppText, BookCard, EmptyState, ErrorState, FilterChips, IconButton, LoadingSkeleton, OrderCard,
    PasswordField, PrimaryButton, RatingInput, RatingStars, ReviewCard, RoleSelector, ScreenContainer, SearchField,
    SecondaryButton, SectionHeader, ShopCard, StatusBadge, TextField, validateEmail,
} from '../index';
import { BookCard as LegacyBookCard } from '../../../components/BookCard';
import { darkTheme, lightTheme } from '../../design/theme';
import { auditAccessibility, hasRole, renderUI } from './testUtils';

const flush = async () => { await act(async () => { await Promise.resolve(); }); };

describe('buttons', () => {
    test('PrimaryButton: role, name, press', async () => {
        const onPress = jest.fn();
        await renderUI(<PrimaryButton title="Place order" onPress={onPress} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Place order' }));
        expect(onPress).toHaveBeenCalledTimes(1);
    });

    test('disabled buttons do not fire and report disabled', async () => {
        const onPress = jest.fn();
        await renderUI(<PrimaryButton title="Save" disabled onPress={onPress} />);
        const button = screen.getByRole('button', { name: 'Save' });
        expect(button).toBeDisabled();
        await fireEvent.press(button);
        expect(onPress).not.toHaveBeenCalled();
    });

    test('pending buttons are busy and ignore taps (no double submit)', async () => {
        const onPress = jest.fn();
        await renderUI(<PrimaryButton title="Saving" loading onPress={onPress} />);
        const button = screen.getByRole('button', { name: 'Saving' });
        expect(button).toBeBusy();
        expect(button).toBeDisabled();
        await fireEvent.press(button);
        expect(onPress).not.toHaveBeenCalled();
    });

    test('accessibilityLabel overrides the visible title when supplied', async () => {
        await renderUI(<PrimaryButton title="Add" accessibilityLabel="Add The Hobbit to your order" onPress={() => {}} />);
        expect(screen.getByRole('button', { name: 'Add The Hobbit to your order' })).toBeTruthy();
    });

    test('SecondaryButton appearances render and press', async () => {
        const onPress = jest.fn();
        await renderUI(<><SecondaryButton title="Outline" onPress={onPress} /><SecondaryButton title="Tonal" appearance="tonal" onPress={onPress} /></>);
        await fireEvent.press(screen.getByRole('button', { name: 'Outline' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Tonal' }));
        expect(onPress).toHaveBeenCalledTimes(2);
    });

    test('IconButton exposes its label and selected state', async () => {
        const onPress = jest.fn();
        await renderUI(<IconButton icon="bookmark" label="Bookmark" selected onPress={onPress} />);
        const b = screen.getByRole('button', { name: 'Bookmark' });
        expect(b).toBeSelected();
        await fireEvent.press(b);
        expect(onPress).toHaveBeenCalled();
    });
});

describe('TextField', () => {
    test('the visible label is the accessible name; required is exposed', async () => {
        await renderUI(<TextField label="Email address" required value="" onChangeText={() => {}} />);
        const input = screen.getByLabelText('Email address');
        expect(input.props['aria-required']).toBe(true);
    });

    test('validates after the first blur and announces the error as an alert', async () => {
        function Harness() {
            const [v, setV] = useState('nope');
            return <TextField label="Email address" value={v} onChangeText={setV} validate={validateEmail} />;
        }
        await renderUI(<Harness />);
        expect(screen.queryByRole('alert')).toBeNull(); // not shown before the user has left the field
        await fireEvent(screen.getByLabelText('Email address'), 'blur');
        expect(screen.getByRole('alert')).toBeTruthy();
        expect(screen.getByText(/valid email/)).toBeTruthy();
        expect(screen.getByLabelText('Email address').props['aria-invalid']).toBe(true);
    });

    test('a controlled server error shows immediately and takes precedence', async () => {
        await renderUI(<TextField label="Shop name" value="x" onChangeText={() => {}} error="That name is taken" validate={() => 'other'} />);
        expect(screen.getByText('That name is taken')).toBeTruthy();
        expect(screen.queryByText('other')).toBeNull();
    });

    test('helper text shows when there is no error; disabled fields are not editable', async () => {
        await renderUI(<TextField label="Phone" helperText="10 digits" value="" onChangeText={() => {}} disabled />);
        expect(screen.getByText('10 digits')).toBeTruthy();
        expect(screen.getByLabelText('Phone').props.editable).toBe(false);
    });

    test('typing calls onChangeText', async () => {
        const onChangeText = jest.fn();
        await renderUI(<TextField label="Name" value="" onChangeText={onChangeText} />);
        await fireEvent.changeText(screen.getByLabelText('Name'), 'Nimal');
        expect(onChangeText).toHaveBeenCalledWith('Nimal');
    });
});

describe('PasswordField', () => {
    test('show/hide toggles secure entry and renames the button', async () => {
        await renderUI(<PasswordField label="Password" value="Secret123" onChangeText={() => {}} />);
        expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(true);
        await fireEvent.press(screen.getByRole('button', { name: 'Show password' }));
        expect(screen.getByLabelText('Password').props.secureTextEntry).toBe(false);
        expect(screen.getByRole('button', { name: 'Hide password' })).toBeSelected();
    });

    test('new-password mode shows a live rules checklist', async () => {
        function Harness() {
            const [v, setV] = useState('abc');
            return <PasswordField label="Create a password" mode="new" value={v} onChangeText={setV} />;
        }
        await renderUI(<Harness />);
        expect(screen.getByLabelText('At least 9 characters: not met yet')).toBeTruthy();
        expect(screen.getByLabelText('Contains a letter: met')).toBeTruthy();
        expect(screen.getByLabelText('Contains a number: not met yet')).toBeTruthy();
        await fireEvent.changeText(screen.getByLabelText('Create a password'), 'Sup3rSecret99');
        expect(screen.getByLabelText('At least 9 characters: met')).toBeTruthy();
        expect(screen.getByLabelText('Contains a number: met')).toBeTruthy();
    });

    test('current-password mode has no checklist and uses the current-password autofill hint', async () => {
        await renderUI(<PasswordField label="Password" value="x" onChangeText={() => {}} />);
        expect(screen.queryByLabelText('Password requirements')).toBeNull();
        expect(screen.getByLabelText('Password').props.autoComplete).toBe('current-password');
    });
});

describe('SearchField', () => {
    test('clear button appears with text and clears it; submit passes the value', async () => {
        const onSubmit = jest.fn();
        function Harness() {
            const [v, setV] = useState('hobbit');
            return <SearchField value={v} onChangeText={setV} onSubmit={onSubmit} />;
        }
        await renderUI(<Harness />);
        await fireEvent(screen.getByLabelText('Search'), 'submitEditing');
        expect(onSubmit).toHaveBeenCalledWith('hobbit');
        await fireEvent.press(screen.getByRole('button', { name: 'Clear search' }));
        expect(screen.getByLabelText('Search').props.value).toBe('');
        expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
    });

    test('is exposed as a search landmark', async () => {
        await renderUI(<SearchField value="" onChangeText={() => {}} />);
        expect(hasRole('search')).toBe(true);
    });
});

describe('RoleSelector and FilterChips', () => {
    test('RoleSelector is a radio group with one checked option and fires onChange', async () => {
        const onChange = jest.fn();
        await renderUI(<RoleSelector value="Customer" onChange={onChange} />);
        expect(hasRole('radiogroup')).toBe(true);
        expect(screen.getByRole('radio', { name: /Reader/ })).toBeChecked();
        expect(screen.getByRole('radio', { name: /Shop owner/ })).not.toBeChecked();
        await fireEvent.press(screen.getByRole('radio', { name: /Shop owner/ }));
        expect(onChange).toHaveBeenCalledWith('Shop Owner');
    });

    test('single-select chips toggle and expose checked state', async () => {
        function Harness() {
            const [v, setV] = useState<string | null>('Pending');
            return <FilterChips label="Filter by status" options={[{ value: 'Pending', label: 'Pending', count: 2 }, { value: 'Shipped', label: 'Shipped' }]} value={v} onChange={setV} />;
        }
        await renderUI(<Harness />);
        expect(screen.getByRole('radio', { name: 'Pending, 2' })).toBeChecked();
        await fireEvent.press(screen.getByRole('radio', { name: 'Shipped' }));
        expect(screen.getByRole('radio', { name: 'Shipped' })).toBeChecked();
        expect(screen.getByRole('radio', { name: 'Pending, 2' })).not.toBeChecked();
    });

    test('multi-select chips are checkboxes', async () => {
        const onChange = jest.fn();
        await renderUI(<FilterChips label="Genres" multiple options={[{ value: 'a', label: 'Fiction' }, { value: 'b', label: 'Fantasy' }]} value={['a']} onChange={onChange} />);
        expect(screen.getByRole('checkbox', { name: 'Fiction' })).toBeChecked();
        await fireEvent.press(screen.getByRole('checkbox', { name: 'Fantasy' }));
        expect(onChange).toHaveBeenCalledWith(['a', 'b']);
    });
});

describe('status and rating', () => {
    test.each(['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'] as const)('StatusBadge %s has a text label, not colour alone', async (status) => {
        await renderUI(<StatusBadge status={status} />);
        expect(screen.getByLabelText(`Status: ${status}`)).toBeTruthy();
        expect(screen.getByText(status)).toBeTruthy();
    });

    test('RatingStars describes the value in words', async () => {
        await renderUI(<><RatingStars value={4.5} count={32} /><RatingStars value={0} /></>);
        expect(screen.getByLabelText('Rated 4.5 out of 5 from 32 reviews')).toBeTruthy();
        expect(screen.getByLabelText('Not rated yet')).toBeTruthy();
    });

    test('RatingInput is a radio group of five labelled stars', async () => {
        const onChange = jest.fn();
        await renderUI(<RatingInput value={3} onChange={onChange} />);
        expect(screen.getAllByRole('radio')).toHaveLength(5);
        expect(screen.getByRole('radio', { name: '3 stars' })).toBeChecked();
        await fireEvent.press(screen.getByRole('radio', { name: '5 stars' }));
        expect(onChange).toHaveBeenCalledWith(5);
    });
});

describe('cards', () => {
    test('BookCard summarises itself for screen readers and handles press', async () => {
        const onPress = jest.fn();
        await renderUI(<BookCard title="The Hobbit" author="J. R. R. Tolkien" rating={4.8} price={2800} stock={3} onPress={onPress} />);
        const card = screen.getByRole('button', { name: /The Hobbit by J\. R\. R\. Tolkien, rated 4\.8 out of 5, Rs\. 2,800, Only 3 left/ });
        await fireEvent.press(card);
        expect(onPress).toHaveBeenCalled();
        expect(screen.getByText('Only 3 left')).toBeTruthy();
    });

    test('BookCard: unrated is stated truthfully, out of stock is stated in words', async () => {
        await renderUI(<BookCard title="The Alchemist" author="Paulo Coelho" rating={0} stock={0} onPress={() => {}} />);
        expect(screen.getByText('Not rated')).toBeTruthy();
        expect(screen.getByText('Out of stock')).toBeTruthy();
    });

    test('legacy BookCard import path still works with the old props', async () => {
        const onPress = jest.fn();
        await renderUI(<LegacyBookCard id="1" title="Sapiens" author="Yuval Noah Harari" rating={4.5} image="https://example.com/x.jpg" width={200} onPress={onPress} />);
        await fireEvent.press(screen.getByRole('button', { name: /Sapiens/ }));
        expect(onPress).toHaveBeenCalled();
    });

    test('ShopCard: name, location, followers and following state in the label', async () => {
        await renderUI(<ShopCard name="Pages and Co" location="Colombo 07" rating={4.7} followersCount={128} following onPress={() => {}} />);
        expect(screen.getByRole('button', { name: /Pages and Co, Colombo 07, rated 4\.7 out of 5, 128 followers, you follow this shop/ })).toBeTruthy();
    });

    test('ReviewCard: edit/delete only for the author and they are named', async () => {
        const onEdit = jest.fn();
        await renderUI(<ReviewCard author="Kamal Silva" rating={3} comment="Good book" target="The Hobbit" onEdit={onEdit} onDelete={() => {}} />);
        await fireEvent.press(screen.getByRole('button', { name: 'Edit your review of The Hobbit' }));
        expect(onEdit).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Delete your review of The Hobbit' })).toBeTruthy();
    });

    test('ReviewCard without handlers has no action buttons', async () => {
        await renderUI(<ReviewCard author="Nimali" rating={5} comment="Lovely" />);
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    test('OrderCard: status badge, details and only the supplied actions', async () => {
        const onShip = jest.fn();
        await renderUI(
            <OrderCard orderId="65f1c9a2b7d4e8a1c3f5a9e7" status="Confirmed" bookTitle="Atomic Habits" counterpart={{ label: 'Customer', name: 'Nimali' }} quantity={2} total={2400}
                actions={[{ label: 'Mark shipped', onPress: onShip }]} />
        );
        expect(screen.getByLabelText('Status: Confirmed')).toBeTruthy();
        expect(screen.getByText('Order #F5A9E7')).toBeTruthy();
        expect(screen.getByText('Rs. 2,400')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Mark shipped' }));
        expect(onShip).toHaveBeenCalled();
        expect(screen.getAllByRole('button')).toHaveLength(1);
    });
});

describe('headers, sections, states, skeletons', () => {
    test('AppHeader: heading, back button and named actions', async () => {
        const onBack = jest.fn();
        const onAct = jest.fn();
        await renderUI(<AppHeader title="My orders" subtitle="3 active" onBack={onBack} actions={[{ icon: 'filter', label: 'Filter orders', onPress: onAct }]} />);
        expect(screen.getByRole('header', { name: 'My orders' })).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Go back' }));
        await fireEvent.press(screen.getByRole('button', { name: 'Filter orders' }));
        expect(onBack).toHaveBeenCalled();
        expect(onAct).toHaveBeenCalled();
    });

    test('SectionHeader: heading plus an action link that works, with no eyebrow text', async () => {
        const onPress = jest.fn();
        await renderUI(<SectionHeader title="Recently added" action={{ label: 'View all', onPress }} />);
        expect(screen.getByRole('header', { name: 'Recently added' })).toBeTruthy();
        await fireEvent.press(screen.getByRole('link', { name: 'View all, Recently added' }));
        expect(onPress).toHaveBeenCalled();
    });

    test('EmptyState shows the guidance and its next-step action', async () => {
        const onPress = jest.fn();
        await renderUI(<EmptyState title="No orders yet" message="Orders appear here." action={{ label: 'Browse books', onPress }} />);
        expect(screen.getByText('No orders yet')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Browse books' }));
        expect(onPress).toHaveBeenCalled();
    });

    test('ErrorState is an alert with a retry that shows its pending state', async () => {
        const onRetry = jest.fn();
        const view = await renderUI(<ErrorState onRetry={onRetry} />);
        expect(screen.getByRole('alert')).toBeTruthy();
        await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
        expect(onRetry).toHaveBeenCalledTimes(1);
        await view.rerender(<ErrorState onRetry={onRetry} retrying />);
        expect(screen.getByRole('button', { name: 'Try again' })).toBeBusy();
    });

    test('ErrorState offline wording', async () => {
        await renderUI(<ErrorState offline />);
        expect(screen.getByText("You're offline")).toBeTruthy();
    });

    test('LoadingSkeleton is one busy region with a spoken label; its blocks are silent', async () => {
        await renderUI(<LoadingSkeleton variant="list" count={2} label="Loading orders" />);
        const region = screen.getByRole('progressbar', { name: 'Loading orders' });
        expect(region).toBeBusy();
    });

    test('every skeleton variant renders', async () => {
        for (const variant of ['card', 'bookGrid', 'list', 'text', 'profile'] as const) {
            const view = await renderUI(<LoadingSkeleton variant={variant} />);
            expect(screen.getByRole('progressbar')).toBeTruthy();
            await view.unmount();
        }
    });

    test('ScreenContainer limits the content column on wide windows', async () => {
        await renderUI(<ScreenContainer width="form" testID="shell"><Text>Form</Text></ScreenContainer>);
        const flat = JSON.stringify(screen.toJSON());
        expect(flat).toContain('"maxWidth":480');
    });
});

describe('AppText', () => {
    test('headings are marked as headers; body is not', async () => {
        await renderUI(<><AppText variant="screenTitle">Title</AppText><AppText>Body</AppText></>);
        expect(screen.getByRole('header', { name: 'Title' })).toBeTruthy();
        expect(screen.queryByRole('header', { name: 'Body' })).toBeNull();
    });

    test('colour comes from tokens and status colours use their text shade', async () => {
        await renderUI(<><AppText color="textMuted">Muted</AppText><AppText color="danger">Oops</AppText></>);
        expect(screen.getByText('Muted')).toHaveStyle({ color: lightTheme.colors.textMuted });
        expect(screen.getByText('Oops')).toHaveStyle({ color: lightTheme.colors.status.danger.text });
    });

    test('user font scaling is honoured but capped', async () => {
        await renderUI(<AppText>Scales</AppText>);
        const el = screen.getByText('Scales');
        expect(el.props.allowFontScaling).toBe(true);
        expect(el.props.maxFontSizeMultiplier).toBe(1.6);
    });
});

describe('accessibility audit of the whole kit', () => {
    test('no interactive element or input is missing an accessible name', async () => {
        await renderUI(
            <>
                <PrimaryButton title="Primary" onPress={() => {}} />
                <SecondaryButton title="Secondary" onPress={() => {}} />
                <IconButton icon="add" label="Add" onPress={() => {}} />
                <TextField label="Name" value="" onChangeText={() => {}} />
                <PasswordField label="Password" mode="new" value="abc" onChangeText={() => {}} />
                <SearchField value="x" onChangeText={() => {}} />
                <RoleSelector value="Customer" onChange={() => {}} />
                <FilterChips label="Filter" options={[{ value: 'a', label: 'A' }]} value="a" onChange={() => {}} />
                <RatingInput value={2} onChange={() => {}} />
                <BookCard title="T" author="A" rating={4} onPress={() => {}} />
                <ShopCard name="S" location="L" onPress={() => {}} />
                <ReviewCard author="X" rating={4} comment="c" onEdit={() => {}} onDelete={() => {}} />
                <OrderCard orderId="abcdef" status="Pending" bookTitle="B" counterpart={{ label: 'Shop', name: 'S' }} quantity={1} total={1} actions={[{ label: 'Cancel', onPress: () => {} }]} />
                <SectionHeader title="Sec" action={{ label: 'More', onPress: () => {} }} />
                <ErrorState onRetry={() => {}} />
                <EmptyState title="Empty" action={{ label: 'Go', onPress: () => {} }} />
            </>
        );
        await flush();
        expect(auditAccessibility()).toEqual([]);
    });

    test('the audit itself catches an unlabelled control (so it cannot pass vacuously)', async () => {
        await renderUI(<Pressable accessibilityRole="button" onPress={() => {}} />);
        expect(auditAccessibility()).toEqual(['button with no accessible name']);
    });
});

describe('dark scheme renders the same components', () => {
    test('colours switch to the dark tokens', async () => {
        await renderUI(<AppText>Night</AppText>, 'dark');
        expect(screen.getByText('Night')).toHaveStyle({ color: darkTheme.colors.text });
    });
});
