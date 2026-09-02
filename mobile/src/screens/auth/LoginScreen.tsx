import React, {useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  View,
  type TextInput as NativeTextInput,
} from 'react-native';
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  TextInput,
} from 'react-native-paper';

import {useStartup} from '../../app/startup/StartupProvider';
import {SafeAreaScreen} from '../../components/layout/SafeAreaScreen';
import {useLoginController} from '../../features/auth/useLoginController';
import {tokens} from '../../theme/tokens';

export function LoginScreen(): JSX.Element {
  const {changeServer, state} = useStartup();
  if (state.phase !== 'needs_auth') {
    return (
      <SafeAreaScreen style={styles.screen}>
        <View style={styles.loadingGate}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaScreen>
    );
  }
  return (
    <LoginForm
      changeServer={changeServer}
      server={state.settings.serverAddress}
    />
  );
}

function LoginForm({
  server,
  changeServer,
}: {
  server: string;
  changeServer(): Promise<void>;
}): JSX.Element {
  const controller = useLoginController(server);
  const passwordRef = useRef<NativeTextInput | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({username: false, password: false});

  const fieldErrors = useMemo(
    () => ({
      username:
        touched.username && !username.trim() ? '请输入账号或邮箱。' : '',
      password: touched.password && !password ? '请输入密码。' : '',
    }),
    [password, touched, username],
  );
  const canSubmit =
    Boolean(username.trim() && password) &&
    !controller.submitting &&
    !controller.checkingServer &&
    !controller.registrationOpen;

  const submit = async () => {
    setTouched({username: true, password: true});
    controller.clearError();
    if (!username.trim() || !password) {
      return;
    }
    Keyboard.dismiss();
    await controller.submit(username, password);
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <View style={styles.brandRow} accessibilityRole="header">
            <View style={styles.brandMark} />
            <Text variant="titleLarge" style={styles.brandName}>
              DeepTutor
            </Text>
          </View>

          <View style={styles.heading}>
            <Text variant="headlineMedium" style={styles.title}>
              欢迎回来
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              登录后继续你的学习对话和进度。
            </Text>
          </View>

          <Surface elevation={0} style={styles.formSurface}>
            <View style={styles.serverRow}>
              <View style={styles.serverCopy}>
                <Text variant="labelMedium" style={styles.serverLabel}>
                  当前服务器
                </Text>
                <Text
                  numberOfLines={1}
                  variant="bodySmall"
                  style={styles.serverValue}>
                  {server}
                </Text>
              </View>
              <Button compact mode="text" onPress={changeServer}>
                更换
              </Button>
            </View>

            {controller.checkingServer ? (
              <View style={styles.checkingRow} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" />
                <Text variant="bodyMedium" style={styles.helperText}>
                  正在检查服务器登录方式…
                </Text>
              </View>
            ) : null}

            {controller.registrationOpen ? (
              <Surface elevation={0} style={styles.infoNotice}>
                <Text variant="bodyMedium" style={styles.infoText}>
                  这台服务器还没有账号，请先在 Web 端完成首个管理员注册。
                </Text>
              </Surface>
            ) : null}

            <View style={styles.fieldGroup}>
              <TextInput
                autoCapitalize="none"
                autoComplete="username"
                autoCorrect={false}
                disabled={controller.submitting}
                error={Boolean(fieldErrors.username)}
                label="账号或邮箱"
                mode="outlined"
                onBlur={() =>
                  setTouched(current => ({...current, username: true}))
                }
                onChangeText={value => {
                  setUsername(value);
                  controller.clearError();
                }}
                onSubmitEditing={() => passwordRef.current?.focus()}
                returnKeyType="next"
                textContentType="username"
                value={username}
              />
              {fieldErrors.username ? (
                <Text variant="bodySmall" style={styles.fieldError}>
                  {fieldErrors.username}
                </Text>
              ) : null}
            </View>

            <View style={styles.fieldGroup}>
              <TextInput
                ref={passwordRef}
                autoComplete="current-password"
                disabled={controller.submitting}
                error={Boolean(fieldErrors.password)}
                label="密码"
                mode="outlined"
                onBlur={() =>
                  setTouched(current => ({...current, password: true}))
                }
                onChangeText={value => {
                  setPassword(value);
                  controller.clearError();
                }}
                onSubmitEditing={submit}
                returnKeyType="done"
                right={
                  <TextInput.Icon
                    accessibilityLabel={showPassword ? '隐藏密码' : '显示密码'}
                    icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    onPress={() => setShowPassword(value => !value)}
                  />
                }
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
              />
              {fieldErrors.password ? (
                <Text variant="bodySmall" style={styles.fieldError}>
                  {fieldErrors.password}
                </Text>
              ) : null}
            </View>

            {controller.error ? (
              <Surface
                accessibilityLiveRegion="assertive"
                elevation={0}
                style={styles.errorNotice}>
                <Text variant="bodyMedium" style={styles.errorText}>
                  {controller.error}
                </Text>
                {controller.canRetryServerCheck ? (
                  <Button
                    compact
                    mode="text"
                    onPress={controller.retryServerCheck}>
                    重新检查
                  </Button>
                ) : null}
              </Surface>
            ) : null}

            <Button
              contentStyle={styles.submitContent}
              disabled={!canSubmit}
              loading={controller.submitting}
              mode="contained"
              onPress={submit}>
              {controller.submitting ? '正在登录…' : '登录'}
            </Button>
          </Surface>

          <Text variant="bodySmall" style={styles.footer}>
            支持时凭据保存在系统安全存储；不安全时只保留本次运行。
          </Text>
        </View>
      </ScrollView>
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {backgroundColor: tokens.color.canvas},
  loadingGate: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  scrollContent: {flexGrow: 1, justifyContent: 'center'},
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: tokens.space.lg,
    paddingVertical: tokens.space.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
    marginBottom: tokens.space.xl,
  },
  brandMark: {
    width: 18,
    height: 18,
    borderRadius: tokens.radius.full,
    backgroundColor: tokens.color.primary,
  },
  brandName: {color: tokens.color.ink, fontWeight: '700'},
  heading: {marginBottom: tokens.space.lg, gap: tokens.space.xs},
  title: {color: tokens.color.ink, fontWeight: '700'},
  subtitle: {color: tokens.color.body, lineHeight: 25},
  formSurface: {
    padding: tokens.space.lg,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.color.surface,
    gap: tokens.space.md,
  },
  serverRow: {
    minHeight: tokens.size.touch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  serverCopy: {flex: 1},
  serverLabel: {color: tokens.color.muted},
  serverValue: {marginTop: 2, color: tokens.color.body},
  checkingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.space.sm,
  },
  helperText: {color: tokens.color.muted},
  infoNotice: {
    padding: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.primaryMuted,
  },
  infoText: {color: tokens.color.primaryPressed, lineHeight: 22},
  fieldGroup: {gap: tokens.space.xs},
  fieldError: {color: tokens.color.error, paddingHorizontal: tokens.space.xs},
  errorNotice: {
    padding: tokens.space.sm,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.color.errorSoft,
  },
  errorText: {color: tokens.color.error, lineHeight: 22},
  submitContent: {minHeight: tokens.size.touch},
  footer: {
    marginTop: tokens.space.lg,
    color: tokens.color.muted,
    textAlign: 'center',
  },
});
