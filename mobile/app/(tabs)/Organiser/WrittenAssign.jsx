import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createWrittenAssign } from '../../../data/Organiser/myEvents';

export default function WrittenAssign() {
  const navigation = useNavigation();
  const router = useRouter();
  const { eventId, eventName } = useLocalSearchParams();

  const [staffCount, setStaffCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  const scannerLoginUrl = useMemo(
    () => `https://smartevents-scanner.local/scanner-login/${eventId}`,
    [eventId]
  );

  const onGenerate = async () => {
    setLoading(true);
    try {
      const payload = await createWrittenAssign(eventId, Number(staffCount));
      setResult(payload);
      Alert.alert('Success', 'Scanner credentials generated.');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to generate credentials.');
    } finally {
      setLoading(false);
    }
  };

  const onCopy = async () => {
    if (!result?.credentials?.length) return;
    const text = [
      `Event: ${eventName || eventId}`,
      `Expires: ${new Date(result.expiresAt).toLocaleString()}`,
      `Scanner Login: ${scannerLoginUrl}`,
      '',
      ...result.credentials.map((cred, idx) => `Scanner ${idx + 1}: ${cred.username} / ${cred.password}`),
    ].join('\n');

    if (Platform.OS === 'web' && navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      Alert.alert('Copied', 'Credentials copied to clipboard.');
      return;
    }

    Alert.alert('Credentials', text);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Written Assign</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Event</Text>
        <Text style={styles.value}>{eventName || eventId}</Text>

        <Text style={[styles.label, { marginTop: 14 }]}>Number of staff</Text>
        <View style={styles.staffRow}>
          {[2, 3, 4].map((count) => (
            <TouchableOpacity
              key={count}
              style={[styles.staffBtn, staffCount === count && styles.staffBtnActive]}
              onPress={() => setStaffCount(count)}
            >
              <Text style={[styles.staffBtnText, staffCount === count && styles.staffBtnTextActive]}>{count}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.generateBtn} onPress={onGenerate} disabled={loading}>
          <Text style={styles.generateBtnText}>{loading ? 'Generating...' : 'Generate Login Details'}</Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.expiry}>Expires: {new Date(result.expiresAt).toLocaleString()}</Text>
            <Text style={styles.loginPath}>Login Path: {result.loginPath || scannerLoginUrl}</Text>

            {result.credentials?.map((cred, idx) => (
              <View key={cred.username} style={styles.credRow}>
                <Text style={styles.credTitle}>Scanner {idx + 1}</Text>
                <Text style={styles.credText}>Username: {cred.username}</Text>
                <Text style={styles.credText}>Password: {cred.password}</Text>
              </View>
            ))}

            <TouchableOpacity style={styles.copyBtn} onPress={onCopy}>
              <Text style={styles.copyBtnText}>Copy Credentials</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/Organiser/ScannerLogin',
                  params: { eventId, eventName: eventName || eventId },
                })
              }
            >
              <Text style={styles.loginBtnText}>Open Scanner Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
  content: { padding: 16 },
  label: { color: '#334155', fontSize: 13, fontWeight: '700' },
  value: { color: '#0f172a', fontSize: 16, marginTop: 6, fontWeight: '600' },
  staffRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  staffBtn: {
    width: 46,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  staffBtnActive: { backgroundColor: '#0b4f78', borderColor: '#0b4f78' },
  staffBtnText: { color: '#334155', fontWeight: '700' },
  staffBtnTextActive: { color: '#fff' },
  generateBtn: {
    marginTop: 14,
    backgroundColor: '#0b4f78',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  generateBtnText: { color: '#fff', fontWeight: '700' },
  resultCard: {
    marginTop: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dbe7f3',
    borderRadius: 12,
    padding: 12,
  },
  expiry: { color: '#0f172a', fontWeight: '700' },
  loginPath: { color: '#1e3a8a', marginTop: 6, fontSize: 12 },
  credRow: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    backgroundColor: '#f8fbff',
    padding: 10,
  },
  credTitle: { color: '#0b4f78', fontWeight: '800', marginBottom: 4 },
  credText: { color: '#334155' },
  copyBtn: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    alignItems: 'center',
    paddingVertical: 10,
  },
  copyBtnText: { color: '#3730a3', fontWeight: '700' },
  loginBtn: {
    marginTop: 10,
    borderRadius: 10,
    backgroundColor: '#0b4f78',
    alignItems: 'center',
    paddingVertical: 10,
  },
  loginBtnText: { color: '#fff', fontWeight: '700' },
});
