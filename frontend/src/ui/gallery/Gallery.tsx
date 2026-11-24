import React, { ReactNode, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { evaluatePairs } from '../../design/a11yPairs';
import { formatRatio } from '../../design/contrast';
import { ColorScheme, TextVariant, palette, radii, shadows, spacing, textStyles } from '../../design/tokens';
import { ThemeProvider, useTheme } from '../../theme/ThemeContext';
import {
  AppHeader, AppText, BookCard, BottomSheet, ConfirmationDialog, EmptyState, ErrorState, FilterChips, IconButton,
  LoadingSkeleton, OrderCard, PasswordField, PrimaryButton, RatingInput, RatingStars, ResponsiveGrid, ReviewCard,
  RoleSelector, ScreenContainer, SearchField, SecondaryButton, SectionHeader, ShopCard, StatusBadge, TextField,
  useBreakpoint, useConfirm, useToast, validateEmail,
} from '../index';
import type { OrderStatus } from '../components/StatusBadge';

/** A labelled specimen. Plain spacing, no card around it: components are shown on the page itself. */
function Specimen({ label, children, note }: { label: string; children: ReactNode; note?: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
      <AppText variant="label" color="textSecondary">{label}</AppText>
      {children}
      {note ? <AppText variant="caption" color="textMuted">{note}</AppText> : null}
    </View>
  );
}

const BOOKS = [
  { title: 'Pride and Prejudice', author: 'Jane Austen', rating: 4.6, count: 128, price: 1500, stock: 12 },
  { title: 'The Hobbit', author: 'J. R. R. Tolkien', rating: 4.8, count: 301, price: 2800, stock: 3 },
  { title: 'Atomic Habits', author: 'James Clear', rating: 4.4, count: 87, price: 1200, stock: 20 },
  { title: 'The Alchemist', author: 'Paulo Coelho', rating: 0, count: 0, price: 950, stock: 0 },
  { title: 'Sapiens', author: 'Yuval Noah Harari', rating: 4.5, count: 54, price: 3500, stock: 15 },
  { title: 'Madol Doova', author: 'Martin Wickramasinghe', rating: 4.9, count: 40, price: 1100, stock: 8 },
];

const STATUSES: OrderStatus[] = ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'];

function ColorSection() {
  const theme = useTheme();
  const results = evaluatePairs(theme.scheme);
  const failing = results.filter((r) => !r.pass);
  const swatches: [string, string][] = [
    ['canvas', theme.colors.canvas], ['surfaceRaised', theme.colors.surfaceRaised], ['surfaceMuted', theme.colors.surfaceMuted],
    ['primary', theme.colors.primary], ['primarySoft', theme.colors.primarySoft], ['accentFill', theme.colors.accentFill],
    ['accent (text)', theme.colors.accent], ['accentSoft', theme.colors.accentSoft], ['borderStrong', theme.colors.borderStrong],
    ['success', theme.colors.status.success.solid], ['warning', theme.colors.status.warning.solid],
    ['danger', theme.colors.status.danger.solid], ['info', theme.colors.status.info.solid],
  ];
  return (
    <>
      <SectionHeader title="Colour" subtitle={`Brand palette: canvas ${palette.canvas}, primary ${palette.primary}, accent ${palette.accent}, surface ${palette.surface}, text ${palette.text}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.smd, marginBottom: theme.spacing.md }}>
        {swatches.map(([name, hex]) => (
          <View key={name} style={{ width: 96, gap: theme.spacing.xs }}>
            <View style={{ height: 48, borderRadius: theme.radii.sm, backgroundColor: hex, borderWidth: 1, borderColor: theme.colors.border }} />
            <AppText variant="caption" numberOfLines={1}>{name}</AppText>
            <AppText variant="caption" color="textMuted">{hex}</AppText>
          </View>
        ))}
      </View>
      <Specimen
        label={`Contrast check, ${theme.scheme} scheme: ${results.length - failing.length} of ${results.length} pairs pass`}
        note="Every pairing the components use, with its WCAG minimum (4.5:1 text, 3:1 control boundaries). The same table is asserted by the automated tests."
      >
        {failing.length ? <AppText variant="bodySmall" color="danger">{failing.length} pair(s) below their minimum: {failing.map((f) => f.id).join(', ')}</AppText> : null}
        <View style={{ gap: theme.spacing.xs }}>
          {results.slice(0, 14).map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd }}>
              <View style={{ width: 56, height: 28, borderRadius: theme.radii.xs, backgroundColor: r.bgHex, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <AppText variant="caption" weight="bold" style={{ color: r.fgHex }}>Aa</AppText>
              </View>
              <AppText variant="caption" style={{ flex: 1 }} numberOfLines={1}>{r.id}</AppText>
              <AppText variant="caption" color={r.pass ? 'success' : 'danger'} weight="semibold">{formatRatio(r.ratio)} (min {r.min})</AppText>
            </View>
          ))}
        </View>
      </Specimen>
    </>
  );
}

function TypeSection() {
  const variants = Object.keys(textStyles) as TextVariant[];
  return (
    <>
      <SectionHeader title="Typography" subtitle="Newsreader for display and headings, Inter for interface text" />
      {variants.map((v) => (
        <Specimen key={v} label={`${v}  ·  ${textStyles[v].family}, ${textStyles[v].size}/${textStyles[v].lineHeight}`}>
          <AppText variant={v} color={v === 'link' ? 'primary' : 'text'}>
            {v === 'display' ? 'Books for curious readers' : v === 'screenTitle' ? 'Discover books' : v === 'sectionTitle' ? 'Recently added' : 'The quick brown fox jumps over the lazy dog'}
          </AppText>
        </Specimen>
      ))}
    </>
  );
}

function ButtonSection() {
  const theme = useTheme();
  const [pending, setPending] = useState(false);
  return (
    <>
      <SectionHeader title="Buttons" subtitle="Press, hover and keyboard focus feedback; pending and disabled states" />
      <Specimen label="Primary: sizes">
        <View style={{ gap: theme.spacing.sm }}>
          <PrimaryButton title="Place order" iconRight="arrow-forward" size="lg" fullWidth onPress={() => {}} />
          <PrimaryButton title="Add to cart" icon="cart-outline" onPress={() => {}} />
          <PrimaryButton title="Save" size="sm" onPress={() => {}} />
        </View>
      </Specimen>
      <Specimen label="Primary: pending (tap it) · disabled · danger">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.smd }}>
          <PrimaryButton title={pending ? 'Saving' : 'Save changes'} loading={pending} onPress={() => { setPending(true); setTimeout(() => setPending(false), 1800); }} />
          <PrimaryButton title="Unavailable" disabled onPress={() => {}} />
          <PrimaryButton title="Delete shop" tone="danger" icon="trash-outline" onPress={() => {}} />
        </View>
      </Specimen>
      <Specimen label="Secondary: outline · tonal · disabled">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.smd }}>
          <SecondaryButton title="Follow shop" icon="add" onPress={() => {}} />
          <SecondaryButton title="View details" appearance="tonal" onPress={() => {}} />
          <SecondaryButton title="Not now" disabled onPress={() => {}} />
        </View>
      </Specimen>
      <Specimen label="Icon buttons (visual 40-52, touch target always 44+)">
        <View style={{ flexDirection: 'row', gap: theme.spacing.smd, alignItems: 'center' }}>
          <IconButton icon="heart-outline" label="Add to favourites" appearance="plain" onPress={() => {}} />
          <IconButton icon="share-outline" label="Share" appearance="tonal" onPress={() => {}} />
          <IconButton icon="add" label="Add book" appearance="filled" size="lg" onPress={() => {}} />
          <IconButton icon="trash-outline" label="Delete" color="danger" onPress={() => {}} />
          <IconButton icon="bookmark" label="Bookmarked" selected onPress={() => {}} />
        </View>
      </Specimen>
    </>
  );
}

function FormSection() {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<'Customer' | 'Shop Owner'>('Customer');
  const [status, setStatus] = useState<string | null>('Pending');
  const [genres, setGenres] = useState<string[]>(['Fiction']);
  const [rating, setRating] = useState(4);
  return (
    <>
      <SectionHeader title="Forms" subtitle="Visible labels, inline validation after first blur, clear states" />
      <Specimen label="TextField: validates on blur (type an invalid email, then tab away)">
        <TextField label="Email address" required leftIcon="mail-outline" value={email} onChangeText={setEmail} validate={validateEmail} keyboardType="email-address" autoCapitalize="none" />
      </Specimen>
      <Specimen label="TextField: helper · server error · disabled">
        <TextField label="Phone number" helperText="10 digits, for order updates" value="" onChangeText={() => {}} />
        <TextField label="Shop name" value="Pages and Co" onChangeText={() => {}} error="A shop with this name already exists in Colombo. Try adding your street." />
        <TextField label="Location" value="Colombo (cannot be changed)" onChangeText={() => {}} disabled />
      </Specimen>
      <Specimen label="PasswordField: new-password mode with live checklist">
        <PasswordField label="Create a password" mode="new" value={password} onChangeText={setPassword} />
      </Specimen>
      <Specimen label="SearchField">
        <SearchField value={query} onChangeText={setQuery} onSubmit={() => {}} />
      </Specimen>
      <Specimen label="RoleSelector (radio group)">
        <RoleSelector value={role} onChange={setRole} />
      </Specimen>
      <Specimen label="FilterChips: single select · multiple select">
        <FilterChips label="Filter orders by status" options={STATUSES.map((s) => ({ value: s, label: s }))} value={status} onChange={setStatus} />
        <FilterChips label="Filter by genre" multiple layout="wrap" options={[{ value: 'Fiction', label: 'Fiction', count: 42 }, { value: 'Fantasy', label: 'Fantasy', count: 18 }, { value: 'History', label: 'History', count: 9 }, { value: 'Self-help', label: 'Self-help', count: 14 }]} value={genres} onChange={setGenres} />
      </Specimen>
      <Specimen label="RatingInput and RatingStars">
        <RatingInput value={rating} onChange={setRating} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.lg, flexWrap: 'wrap' }}>
          <RatingStars value={4.5} count={32} size="md" />
          <RatingStars value={0} />
        </View>
      </Specimen>
    </>
  );
}

function CardSection() {
  const theme = useTheme();
  return (
    <>
      <SectionHeader title="Books" subtitle="ResponsiveGrid: columns follow the container width, not the window" action={{ label: 'View all', onPress: () => {} }} />
      <ResponsiveGrid>
        {BOOKS.map((b) => (
          <BookCard key={b.title} title={b.title} author={b.author} rating={b.rating} ratingCount={b.count} price={b.price} stock={b.stock} onPress={() => {}} />
        ))}
      </ResponsiveGrid>

      <SectionHeader title="Shops" />
      <View style={{ gap: theme.spacing.smd }}>
        <ShopCard name="Pages and Co" location="Colombo 07" rating={4.7} ratingCount={41} followersCount={128} following onPress={() => {}} />
        <ShopCard name="The Reading Room" location="Kandy" rating={0} followersCount={1} onPress={() => {}} />
      </View>

      <SectionHeader title="Reviews" />
      <View style={{ gap: theme.spacing.smd }}>
        <ReviewCard author="Nimali Perera" rating={5} date="2026-11-12" comment="Arrived in two days and the edition is beautiful. The shop even wrapped it as a gift." />
        <ReviewCard author="Kamal Silva" rating={3} date="2026-10-30" target="The Hobbit" comment="Good book, but the cover had a small crease when it arrived." onEdit={() => {}} onDelete={() => {}} />
      </View>

      <SectionHeader title="Orders and status" subtitle="Status is always an icon plus a word, never colour alone" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.md }}>
        {STATUSES.map((s) => <StatusBadge key={s} status={s} />)}
        <StatusBadge tone="info" label="3 new" icon="notifications-outline" size="sm" />
      </View>
      <ResponsiveGrid minItemWidth={320} columns={{ compact: 1, phone: 1 }}>
        <OrderCard
          orderId="65f1c9a2b7d4e8a1c3f5a9d2" status="Pending" bookTitle="The Hobbit" bookAuthor="J. R. R. Tolkien"
          counterpart={{ label: 'Shop', name: 'Pages and Co' }} quantity={2} total={5600} date="2026-11-23"
          actions={[{ label: 'Cancel request', tone: 'danger', onPress: () => {} }]}
        />
        <OrderCard
          orderId="65f1c9a2b7d4e8a1c3f5a9e7" status="Confirmed" bookTitle="Atomic Habits" bookAuthor="James Clear"
          counterpart={{ label: 'Customer', name: 'Nimali Perera', detail: '12 Temple Road, Colombo' }} quantity={1} total={1200} date="2026-11-22"
          actions={[{ label: 'Mark shipped', onPress: () => {} }, { label: 'Cancel order', tone: 'secondary', onPress: () => {} }]}
        />
      </ResponsiveGrid>
    </>
  );
}

function FeedbackSection() {
  const theme = useTheme();
  const toast = useToast();
  const confirm = useConfirm();
  const [dialog, setDialog] = useState<null | 'default' | 'danger'>(null);
  const [sheet, setSheet] = useState(false);
  const [retrying, setRetrying] = useState(false);
  return (
    <>
      <SectionHeader title="Feedback and overlays" subtitle="Toasts, dialogs and sheets. Press Escape to close any of them." />
      <Specimen label="Toast">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <SecondaryButton title="Success" size="sm" onPress={() => toast.success('Order placed. The shop will confirm shortly.')} />
          <SecondaryButton title="Error" size="sm" onPress={() => toast.error("We couldn't save your changes. Check your connection and try again.")} />
          <SecondaryButton title="Info" size="sm" onPress={() => toast.info('Stock levels update every few minutes.')} />
          <SecondaryButton title="Warning" size="sm" onPress={() => toast.warning('Only 2 copies left.')} />
          <SecondaryButton title="With action" size="sm" onPress={() => toast.show({ message: 'Review deleted.', action: { label: 'Undo', onPress: () => toast.info('Review restored.') } })} />
        </View>
      </Specimen>
      <Specimen label="Dialogs">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          <SecondaryButton title="Confirm" size="sm" onPress={() => setDialog('default')} />
          <SecondaryButton title="Destructive confirm" size="sm" onPress={() => setDialog('danger')} />
          <SecondaryButton title="confirm() promise" size="sm" onPress={async () => { const ok = await confirm({ title: 'Cancel this order?', message: 'The stock will be returned to the shop.', confirmLabel: 'Cancel order', cancelLabel: 'Keep order', tone: 'danger' }); toast.info(ok ? 'Order cancelled.' : 'Order kept.'); }} />
          <SecondaryButton title="Bottom sheet" size="sm" onPress={() => setSheet(true)} />
        </View>
      </Specimen>

      <Specimen label="LoadingSkeleton: bookGrid · list · text · profile">
        <LoadingSkeleton variant="bookGrid" count={4} label="Loading books" />
        <View style={{ height: theme.spacing.md }} />
        <LoadingSkeleton variant="list" count={2} label="Loading orders" />
        <View style={{ height: theme.spacing.md }} />
        <LoadingSkeleton variant="text" label="Loading description" />
        <View style={{ height: theme.spacing.md }} />
        <LoadingSkeleton variant="profile" label="Loading profile" />
      </Specimen>

      <Specimen label="EmptyState">
        <EmptyState title="No orders yet" message="When you order a book it will appear here, with its status as the shop prepares it." action={{ label: 'Browse books', icon: 'search-outline', onPress: () => {} }} />
      </Specimen>
      <Specimen label="ErrorState (tap Try again to see the pending state)">
        <ErrorState retrying={retrying} onRetry={() => { setRetrying(true); setTimeout(() => setRetrying(false), 1500); }} />
        <ErrorState offline compact onRetry={() => {}} />
      </Specimen>

      <ConfirmationDialog
        visible={dialog === 'default'} title="Publish this stock report?" message="Readers who follow your shop will see it in their alerts."
        confirmLabel="Publish report" onConfirm={() => { setDialog(null); toast.success('Report published.'); }} onCancel={() => setDialog(null)}
      />
      <ConfirmationDialog
        visible={dialog === 'danger'} tone="danger" title="Delete this shop?" message="Its books and reports are removed. Order history is kept."
        confirmLabel="Delete shop" onConfirm={() => { setDialog(null); toast.success('Shop deleted.'); }} onCancel={() => setDialog(null)}
      />
      <BottomSheet visible={sheet} onClose={() => setSheet(false)} title="Filter books">
        <FilterChips label="Genre" layout="wrap" multiple options={[{ value: 'a', label: 'Fiction' }, { value: 'b', label: 'Fantasy' }, { value: 'c', label: 'History' }]} value={['a']} onChange={() => {}} />
        <View style={{ height: theme.spacing.lg }} />
        <PrimaryButton title="Show 42 books" fullWidth onPress={() => setSheet(false)} />
      </BottomSheet>
    </>
  );
}

function ScaleSection() {
  const theme = useTheme();
  const { breakpoint, width } = useBreakpoint();
  return (
    <>
      <SectionHeader title="Spacing, radii, elevation" subtitle={`Current breakpoint: ${breakpoint} (${width} px)`} />
      <Specimen label="Spacing scale">
        <View style={{ gap: theme.spacing.xs }}>
          {Object.entries(spacing).map(([k, v]) => (
            <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.smd }}>
              <AppText variant="caption" style={{ width: 44 }}>{k}</AppText>
              <View style={{ width: v * 3, height: 10, borderRadius: 2, backgroundColor: theme.colors.primary }} />
              <AppText variant="caption" color="textMuted">{v}</AppText>
            </View>
          ))}
        </View>
      </Specimen>
      <Specimen label="Radii and elevation">
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          {(['xs', 'sm', 'md', 'lg'] as const).map((r) => (
            <View key={r} style={{ width: 64, height: 64, borderRadius: radii[r], backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.borderStrong, alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="caption">{r}</AppText>
            </View>
          ))}
          {(['subtle', 'medium', 'high'] as const).map((s) => (
            <View key={s} style={{ width: 64, height: 64, borderRadius: radii.md, backgroundColor: theme.colors.surfaceRaised, ...shadows[s], alignItems: 'center', justifyContent: 'center' }}>
              <AppText variant="caption">{s}</AppText>
            </View>
          ))}
        </View>
      </Specimen>
    </>
  );
}

function GalleryBody({ scheme, onToggleScheme }: { scheme: ColorScheme; onToggleScheme: () => void }) {
  const router = useRouter();
  const { breakpoint, width } = useBreakpoint();
  return (
    <ScreenContainer
      width="content"
      header={
        <AppHeader
          title="Component gallery"
          subtitle={`Development only · ${breakpoint} · ${width} px · ${scheme}`}
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          actions={[{ icon: scheme === 'light' ? 'moon-outline' : 'sunny-outline', label: scheme === 'light' ? 'Switch to dark scheme' : 'Switch to light scheme', onPress: onToggleScheme }]}
        />
      }
    >
      <ColorSection />
      <TypeSection />
      <ButtonSection />
      <FormSection />
      <CardSection />
      <FeedbackSection />
      <ScaleSection />
    </ScreenContainer>
  );
}

/** Development-only preview of every shared component and state. Route: /dev/gallery */
export default function Gallery() {
  const [scheme, setScheme] = useState<ColorScheme>('light');
  return (
    <ThemeProvider scheme={scheme}>
      <GalleryBody scheme={scheme} onToggleScheme={() => setScheme((s) => (s === 'light' ? 'dark' : 'light'))} />
    </ThemeProvider>
  );
}
