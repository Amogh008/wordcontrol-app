import { localize } from "../locales";import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View } from
'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { isGoogleConfigured, useGoogleIdTokenRequest } from '../services/googleAuth';
import OutlinedButton from '../components/OutlinedButton';
import { useAppDialog } from '../context/AppDialogContext';

WebBrowser.maybeCompleteAuthSession();

const titleFont = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

export default function AuthScreen() {
  const { colors } = useTheme();
  const dialog = useAppDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { login, register, verifyEmail, forgotPassword, resetPassword, loginWithGoogle } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [formError, setFormError] = useState('');

  const [request, response, promptAsync] = useGoogleIdTokenRequest();

  useEffect(() => {
    if (response?.type === 'success' && response.params?.id_token) {
      setGoogleSubmitting(true);
      loginWithGoogle(response.params.id_token).
      catch((err) => {
        setFormError(
          err.response?.data?.error || err.message || 'Google sign-in failed.'
        );
      }).
      finally(() => setGoogleSubmitting(false));
    }
  }, [response, loginWithGoogle]);

  const submit = async () => {
    if (mode === 'forgot') {
      if (!email.trim()) {
        setFormError('Enter your email address.');
        return;
      }
      setFormError('');
      setSubmitting(true);
      try {
        await forgotPassword(email.trim());
        setVerificationEmail(email.trim().toLowerCase());
        setVerificationCode('');
        setPassword('');
        setConfirmPassword('');
        setMode('reset');
      } catch (err) {
        setFormError(
          err.response?.data?.error || err.message || 'The reset code could not be sent.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'reset') {
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        setFormError('Enter the six-digit reset code.');
        return;
      }
      if (password.length < 8) {
        setFormError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setFormError('Passwords do not match.');
        return;
      }
      setFormError('');
      setSubmitting(true);
      try {
        await resetPassword({
          email: verificationEmail,
          code: verificationCode.trim(),
          password
        });
        dialog.alert(localize('Password updated'), localize('You can now log in with your new password.'));
        setPassword('');
        setConfirmPassword('');
        setVerificationCode('');
        setMode('login');
      } catch (err) {
        setFormError(
          err.response?.data?.error || err.message || 'Password reset failed.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'verify') {
      if (!/^\d{6}$/.test(verificationCode.trim())) {
        setFormError('Enter the six-digit code from your email.');
        return;
      }
      setFormError('');
      setSubmitting(true);
      try {
        await verifyEmail({
          email: verificationEmail,
          code: verificationCode.trim()
        });
      } catch (err) {
        setFormError(
          err.response?.data?.error || err.message || 'Email verification failed.'
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!email.trim() || !password) {
      setFormError('Email and password are required.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        const result = await register({ email: email.trim(), password, name: name.trim() });
        setVerificationEmail(result.email);
        setVerificationCode('');
        setMode('verify');
      }
    } catch (err) {
      setFormError(
        err.response?.data?.error || err.message || 'Something went wrong. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resendVerificationCode = async () => {
    setFormError('');
    setResending(true);
    try {
      await register({ email: email.trim(), password, name: name.trim() });
      dialog.alert(localize('Code sent'), `A new verification code was sent to ${verificationEmail}.`);
    } catch (err) {
      setFormError(
        err.response?.data?.error || err.message || 'The code could not be resent.'
      );
    } finally {
      setResending(false);
    }
  };

  const resendPasswordResetCode = async () => {
    setFormError('');
    setResending(true);
    try {
      await forgotPassword(verificationEmail);
      dialog.alert(localize('Code sent'), `A new password reset code was sent to ${verificationEmail}.`);
    } catch (err) {
      setFormError(
        err.response?.data?.error || err.message || 'The reset code could not be resent.'
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>{localize("DLT")}</Text>
        <Text style={styles.brandName}>{localize("Deutsche Learn Tool")}</Text>
        <Text style={styles.subtitle}>
          {mode === 'login' ?
          'Log in to your account' :
          mode === 'register' ?
          'Create an account' :
          mode === 'forgot' ?
          'Enter your account email to receive a reset code' :
          mode === 'reset' ?
          `Enter the reset code sent to ${verificationEmail}` :
          `Enter the code sent to ${verificationEmail}`}
        </Text>

        {mode === 'register' ?
        <TextInput
          style={styles.input}
          placeholder={localize("Name")}
          placeholderTextColor={colors.placeholder}
          value={name}
          onChangeText={setName}
          autoCapitalize="words" /> :

        null}
        {mode === 'verify' ?
        <TextInput
          style={[styles.input, styles.codeInput]}
          placeholder={localize("000000")}
          placeholderTextColor={colors.placeholder}
          value={verificationCode}
          onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          maxLength={6} /> :

        mode === 'reset' ?
        <>
            <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder={localize("000000")}
            placeholderTextColor={colors.placeholder}
            value={verificationCode}
            onChangeText={(value) => setVerificationCode(value.replace(/\D/g, '').slice(0, 6))}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6} />

            <TextInput
            style={styles.input}
            placeholder={localize("New password (minimum 8 characters)")}
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none" />

            <TextInput
            style={styles.input}
            placeholder={localize("Confirm new password")}
            placeholderTextColor={colors.placeholder}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none" />

          </> :

        <>
            <TextInput
            style={styles.input}
            placeholder={localize("Email")}
            placeholderTextColor={colors.placeholder}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address" />

            {mode !== 'forgot' ?
          <TextInput
            style={styles.input}
            placeholder={localize("Password")}
            placeholderTextColor={colors.placeholder}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none" /> :

          null}
          </>
        }

        {formError ?
        <View style={styles.errorBox} accessibilityRole="alert">
            <Text style={styles.errorText}>{formError}</Text>
          </View> :
        null}

        <OutlinedButton
          title={mode === 'login' ?
          'Log In' :
          mode === 'register' ?
          'Send Code' :
          mode === 'forgot' ?
          'Send Reset Code' :
          mode === 'reset' ?
          'Set New Password' :
          'Verify Email'}
          icon={mode === 'login' ?
          'login' :
          mode === 'reset' ?
          'key-outline' :
          mode === 'verify' ?
          'checkmark-circle-outline' :
          'mail-outline'}
          onPress={submit}
          disabled={submitting}
          loading={submitting}
          style={styles.primaryButton} />


        {mode === 'login' ?
        <Pressable
          onPress={() => {
            setFormError('');
            setMode('forgot');
          }}>

            <Text style={styles.switchModeText}>{localize("Forgot password?")}</Text>
          </Pressable> :
        null}
        {mode === 'reset' ?
        <Pressable
          onPress={resendPasswordResetCode}
          disabled={resending}
          style={styles.resendButton}>

            <Text style={styles.switchModeText}>
              {resending ? 'Sending a new code…' : 'Resend reset code'}
            </Text>
          </Pressable> :
        null}

        <Pressable
          onPress={() => {
            setFormError('');
            setMode(mode === 'login' ? 'register' : 'login');
          }}>

          <Text style={styles.switchModeText}>
            {mode === 'login' ?
            "Don't have an account? Sign up" :
            mode === 'register' ?
            'Already have an account? Log in' :
            'Back to login'}
          </Text>
        </Pressable>
        {mode === 'verify' ?
        <Pressable
          onPress={resendVerificationCode}
          disabled={resending}
          style={styles.resendButton}>

            <Text style={styles.switchModeText}>
              {resending ? 'Sending a new code…' : 'Resend verification code'}
            </Text>
          </Pressable> :
        null}

        {isGoogleConfigured && (mode === 'login' || mode === 'register') ?
        <>
            <View style={styles.divider} />
            <Pressable
            style={[styles.googleButton, (!request || googleSubmitting) && styles.disabledButton]}
            onPress={() => promptAsync()}
            disabled={!request || googleSubmitting}>

              {googleSubmitting ?
            <ActivityIndicator color={colors.textDark} /> :

            <Text style={styles.googleButtonText}>{localize("Continue with Google")}</Text>
            }
            </Pressable>
          </> :
        null}
      </View>
    </SafeAreaView>);

}

const makeStyles = (colors) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.pageBg },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  title: {
    fontFamily: titleFont,
    fontSize: 34,
    color: colors.textDark,
    textAlign: 'center',
    marginBottom: 4
  },
  brandName: {
    color: colors.misc.text,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.4,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 28
  },
  input: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.textDark,
    marginBottom: 12
  },
  codeInput: {
    textAlign: 'center',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: 8
  },
  errorBox: {
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#c0392b',
    borderRadius: 9,
    backgroundColor: '#c0392b18'
  },
  errorText: {
    color: '#c0392b',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center'
  },
  primaryButton: {
    marginTop: 4
  },
  disabledButton: {
    opacity: 0.6
  },
  switchModeText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 16,
    fontSize: 14
  },
  resendButton: { marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 24
  },
  googleButton: {
    backgroundColor: colors.cardBg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center'
  },
  googleButtonText: {
    color: colors.textDark,
    fontSize: 16,
    fontWeight: '600'
  }
});
