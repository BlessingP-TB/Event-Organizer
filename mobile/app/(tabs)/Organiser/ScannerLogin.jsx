import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { loginWrittenScanner } from '../../../data/Organiser/myEvents';

export default function ScannerLogin() {
  const navigation = useNavigation();
  const router = useRouter();
  const { eventId, eventName } = useLocalSearchParams();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const onLogin = async () => {
    const cleanUser = String(username || '').trim();
    const cleanPass = String(password || '').trim();

    if (!cleanUser || !cleanPass) {
      Alert.alert('Validation', 'Username and password are required.');
      return;
    }

    setLoading(true);
    try {
      const payload = await loginWrittenScanner(eventId, cleanUser, cleanPass);
      await AsyncStorage.setItem(`SCANNER_ACCESS_TOKEN_${eventId}`, payload.accessToken);
      await AsyncStorage.setItem('SCANNER_EVENT_ID', String(eventId));

      router.replace({
        pathname: '/(tabs)/Organiser/ScannerCheckIn',
        params: { eventId, eventName: eventName || eventId },
      });
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Failed to login scanner user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Scanner Login</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.eventText}>Event: {eventName || eventId}</Text>

        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="characters"
          placeholder="Enter scanner username"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter scanner password"
        />

        <TouchableOpacity style={styles.loginBtn} onPress={onLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.loginBtnText}>Login & Start Scanning</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 58 : 24,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff',
  },
  backBtnText: { color: '#0b4f78', fontWeight: '700' },
  title: { fontSize: 20, fontWeight: '800', color: '#0b4f78' },
  card: {
    margin: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe7f3',
    borderRadius: 12,
    padding: 14,
  },
  eventText: { color: '#0f172a', fontWeight: '700', marginBottom: 12 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700', marginTop: 8 },
  input: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  loginBtn: {
    marginTop: 14,
    borderRadius: 10,
    backgroundColor: '#0b4f78',
    alignItems: 'center',
    paddingVertical: 12,
  },
  loginBtnText: { color: '#fff', fontWeight: '700' },
});
