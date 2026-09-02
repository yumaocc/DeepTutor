import React, {useState} from 'react';
import {ActivityIndicator, Button, Text, TextInput} from 'react-native-paper';
import {StyleSheet, View} from 'react-native';

import {SafeAreaScreen} from '../../components/layout/SafeAreaScreen';
import {useStartup} from '../../app/startup/StartupProvider';
import {tokens} from '../../theme/tokens';

function GateLayout({
  title,
  body,
  children,
}: React.PropsWithChildren<{title: string; body: string}>): JSX.Element {
  return (
    <SafeAreaScreen style={styles.screen}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {title}
        </Text>
        <Text variant="bodyLarge" style={styles.body}>
          {body}
        </Text>
        {children}
      </View>
    </SafeAreaScreen>
  );
}

export function BootstrapScreen(): JSX.Element {
  return (
    <GateLayout title="DeepTutor" body="正在准备移动端运行环境…">
      <ActivityIndicator size="large" />
    </GateLayout>
  );
}

export function ServerSetupScreen(): JSX.Element {
  const {saveServer} = useStartup();
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await saveServer(address);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : '服务器地址无效',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <GateLayout
      title="连接 DeepTutor"
      body="输入你的 DeepTutor 服务地址。凭据不会写入普通配置存储。">
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        label="服务器地址"
        mode="outlined"
        onChangeText={setAddress}
        placeholder="https://learn.example.com"
        value={address}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        disabled={!address.trim()}
        loading={saving}
        mode="contained"
        onPress={submit}>
        继续
      </Button>
    </GateLayout>
  );
}

export function OfflineScreen(): JSX.Element {
  const {changeServer, retry} = useStartup();
  return (
    <GateLayout
      title="暂时无法连接"
      body="网络不可用或服务器没有响应。恢复网络后可以重试。">
      <Button mode="contained" onPress={retry}>
        重试
      </Button>
      <Button mode="text" onPress={changeServer}>
        更换服务器
      </Button>
    </GateLayout>
  );
}

export function UpgradeRequiredScreen(): JSX.Element {
  const {changeServer} = useStartup();
  return (
    <GateLayout
      title="需要更新"
      body="当前服务器要求更新版本的 DeepTutor Mobile。">
      <Button mode="text" onPress={changeServer}>
        使用其他服务器
      </Button>
    </GateLayout>
  );
}

export function FatalScreen(): JSX.Element {
  const {changeServer, retry, state} = useStartup();
  const message = state.phase === 'fatal' ? state.message : '应用启动失败';
  return (
    <GateLayout title="启动失败" body={message}>
      <Button mode="contained" onPress={retry}>
        重试
      </Button>
      <Button mode="text" onPress={changeServer}>
        清除配置
      </Button>
    </GateLayout>
  );
}

const styles = StyleSheet.create({
  screen: {backgroundColor: tokens.color.canvas},
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: tokens.space.lg,
    gap: tokens.space.md,
  },
  title: {color: tokens.color.ink, fontWeight: '700'},
  body: {color: tokens.color.body, lineHeight: 25},
  error: {color: tokens.color.error},
});
