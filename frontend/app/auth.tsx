import React, { useContext, useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { createDemoUserAPI, loginUserAPI, registerUserAPI } from '../src/api/userApi';
import { AuthContext } from '../src/context/AuthContext';
import { useTheme } from '../src/theme/ThemeContext';
import {
  AppText, Icon, PasswordField, PrimaryButton, RoleSelector, ScreenContainer, SecondaryButton, TextField, compose,
  required, useToast, validateEmail, validatePhone,
} from '../src/ui';

type Role = 'Customer' | 'Shop Owner';
type FieldKey = 'firstName' | 'nearestCity' | 'phoneNumber' | 'email' | 'password';

export default function AuthScreen() {
  const theme = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { loginContext } = useContext(AuthContext);

  const [isLogin, setIsLogin] = useState(true);
  const [userType, setUserType] = useState<Role>('Customer');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [nearestCity, setNearestCity] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<Role | null>(null);
  // Messages shown after a submit attempt (inline validation also runs on blur inside each field)
  const [submitErrors, setSubmitErrors] = useState<Partial<Record<FieldKey, string>>>({});

  const busy = loading || demoLoading !== null;

  const clearError = (key: FieldKey) => setSubmitErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));

  const goHome = (type: string) => router.replace(type === 'Shop Owner' ? ('/owner' as any) : '/(tabs)/dashboard');

  const validateAll = (): Partial<Record<FieldKey, string>> => {
    const errors: Partial<Record<FieldKey, string>> = {
      email: validateEmail(email),
      password: password ? undefined : 'Password is required',
    };
    if (!isLogin) {
      errors.firstName = required('First name')(firstName);
      errors.nearestCity = required('Nearest city')(nearestCity);
      errors.phoneNumber = validatePhone(phoneNumber);
    }
    return Object.fromEntries(Object.entries(errors).filter(([, v]) => v)) as Partial<Record<FieldKey, string>>;
  };

  const handleAuth = async () => {
    const errors = validateAll();
    setSubmitErrors(errors);
    if (Object.keys(errors).length) {
      toast.error('Please fix the highlighted fields and try again.');
      return;
    }

    setLoading(true);
    try {
      const res = isLogin
        ? await loginUserAPI({ email: email.trim(), password })
        : await registerUserAPI({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim(), password, userType, nearestCity: nearestCity.trim(), phoneNumber });
      await loginContext(res.data);
      toast.success(isLogin ? `Welcome back, ${res.data.firstName}.` : `Welcome to Poth, ${res.data.firstName}.`);
      goHome(res.data.userType);
    } catch (error: any) {
      const message = error.response?.data?.message;
      if (error.response?.status === 409 && !isLogin) setSubmitErrors({ email: 'An account with this email already exists. Try signing in.' });
      toast.error(message || (error.response ? 'Something went wrong. Please try again.' : "We couldn't reach the server. Check your connection and try again."));
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (type: Role) => {
    setDemoLoading(type);
    try {
      const res = await createDemoUserAPI(type);
      await loginContext(res.data);
      goHome(type);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "The demo isn't available right now. Please try again in a moment.");
    } finally {
      setDemoLoading(null);
    }
  };

  const switchMode = () => {
    setIsLogin((v) => !v);
    setSubmitErrors({});
  };

  return (
    <ScreenContainer width="form" keyboardAvoiding>
      <View style={{ alignItems: 'center', paddingTop: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.smd }}>
        <Image
          source={require('../assets/images/logo.png')}
          accessibilityLabel="Poth logo"
          style={{ width: 72, height: 72, borderRadius: theme.radii.md }}
          resizeMode="contain"
        />
        <AppText variant="screenTitle" align="center">{isLogin ? 'Welcome back' : 'Join the library'}</AppText>
        <AppText variant="body" color="textSecondary" align="center">
          {isLogin ? 'Continue your curated journey.' : 'Start your literary adventure with us.'}
        </AppText>
      </View>

      {!isLogin ? <RoleSelector value={userType} onChange={setUserType} disabled={busy} /> : null}

      {!isLogin ? (
        <>
          <TextField
            label="First name"
            required
            value={firstName}
            onChangeText={(t) => { setFirstName(t); clearError('firstName'); }}
            error={submitErrors.firstName}
            validate={required('First name')}
            autoCapitalize="words"
            autoComplete="given-name"
            editable={!busy}
          />
          <TextField
            label="Last name"
            hint="(optional)"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            autoComplete="family-name"
            editable={!busy}
          />
          <TextField
            label="Nearest city"
            required
            value={nearestCity}
            onChangeText={(t) => { setNearestCity(t); clearError('nearestCity'); }}
            error={submitErrors.nearestCity}
            validate={required('Nearest city')}
            autoCapitalize="words"
            editable={!busy}
          />
          <TextField
            label="Phone number"
            required
            helperText="10 digits, for order updates"
            value={phoneNumber}
            onChangeText={(t) => { setPhoneNumber(t.replace(/\D/g, '')); clearError('phoneNumber'); }}
            error={submitErrors.phoneNumber}
            validate={validatePhone}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            maxLength={10}
            editable={!busy}
          />
        </>
      ) : null}

      <TextField
        label="Email address"
        required
        leftIcon="mail-outline"
        value={email}
        onChangeText={(t) => { setEmail(t); clearError('email'); }}
        error={submitErrors.email}
        validate={validateEmail}
        keyboardType="email-address"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        editable={!busy}
      />

      <PasswordField
        label="Password"
        required
        mode={isLogin ? 'current' : 'new'}
        value={password}
        onChangeText={(t) => { setPassword(t); clearError('password'); }}
        error={submitErrors.password}
        validate={isLogin ? compose(required('Password')) : undefined}
        onSubmitEditing={handleAuth}
        returnKeyType={isLogin ? 'go' : 'done'}
        editable={!busy}
      />

      <PrimaryButton
        title={isLogin ? 'Log in' : 'Create account'}
        iconRight="arrow-forward"
        size="lg"
        fullWidth
        loading={loading}
        disabled={demoLoading !== null}
        onPress={handleAuth}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap', marginTop: theme.spacing.lg }}>
        <AppText variant="body" color="textSecondary">{isLogin ? 'New to Poth? ' : 'Already have an account? '}</AppText>
        <SecondaryButton title={isLogin ? 'Create an account' : 'Log in'} appearance="tonal" size="sm" onPress={switchMode} disabled={busy} />
      </View>

      {isLogin ? (
        <View
          style={{
            marginTop: theme.spacing.xl,
            padding: theme.spacing.lg,
            gap: theme.spacing.smd,
            borderRadius: theme.radii.md,
            backgroundColor: theme.colors.surfaceMuted,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="compass-outline" size="lg" color="primary" />
            <AppText variant="cardTitle">Just exploring?</AppText>
          </View>
          <AppText variant="bodySmall" color="textSecondary">
            Try Poth with a temporary account. Everything you create is deleted automatically after 24 hours.
          </AppText>
          <View style={{ gap: theme.spacing.sm }}>
            <SecondaryButton
              title="Explore as a reader"
              icon="book-outline"
              fullWidth
              loading={demoLoading === 'Customer'}
              disabled={busy && demoLoading !== 'Customer'}
              onPress={() => handleDemo('Customer')}
            />
            <SecondaryButton
              title="Explore as a shop owner"
              icon="storefront-outline"
              fullWidth
              loading={demoLoading === 'Shop Owner'}
              disabled={busy && demoLoading !== 'Shop Owner'}
              onPress={() => handleDemo('Shop Owner')}
            />
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}
