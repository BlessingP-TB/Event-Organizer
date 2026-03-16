import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { redeemWrittenScannerQr } from '../../../data/Organiser/myEvents';

export default function ScannerCheckIn() {
  const navigation = useNavigation();
  const router = useRouter();
  const { eventId, eventName } = useLocalSearchParams();
  const normalizedEventId = Array.isArray(eventId) ? eventId[0] : eventId;
  const normalizedEventName = Array.isArray(eventName) ? eventName[0] : eventName;

  const [permission, requestPermission] = useCameraPermissions();
  const [manualQr, setManualQr] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready to scan attendee QR codes.');
  const [lastAttendee, setLastAttendee] = useState(null);
  const [scannerToken, setScannerToken] = useState(null);
  const [waitingForNext, setWaitingForNext] = useState(false);

  const isProcessingRef = useRef(false);
  const lastScanRef = useRef({ data: '', ts: 0 });
  const waitingForNextRef = useRef(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadToken = async () => {
      const token = await AsyncStorage.getItem(`SCANNER_ACCESS_TOKEN_${normalizedEventId}`);
      setScannerToken(token);
      if (!token) {
        Alert.alert('Session Expired', 'Please login with scanner credentials again.');
        router.replace({ pathname: '/(tabs)/Organiser/ScannerLogin', params: { eventId: normalizedEventId, eventName: normalizedEventName } });
      }
    };
    loadToken();

    return () => {
      isProcessingRef.current = false;
      waitingForNextRef.current = false;
    };
  }, [normalizedEventId, normalizedEventName, router]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem(`SCANNER_ACCESS_TOKEN_${normalizedEventId}`);
    router.replace({ pathname: '/(tabs)/Organiser/ScannerLogin', params: { eventId: normalizedEventId, eventName: normalizedEventName } });
  };

  const handleScanNextAttendee = () => {
    waitingForNextRef.current = false;
    setWaitingForNext(false);
    setLastAttendee(null);
    setManualQr('');
    setStatusMessage('Ready to scan attendee QR codes.');
  };

  const processScan = async (rawData) => {
    const qrData = String(rawData || '').trim();
    if (!qrData || !scannerToken || waitingForNextRef.current) return;

    const now = Date.now();
    if (lastScanRef.current.data === qrData && now - lastScanRef.current.ts < 1600) {
      return;
    }

    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    lastScanRef.current = { data: qrData, ts: now };

    try {
      const payload = await redeemWrittenScannerQr(normalizedEventId, qrData, scannerToken);
      setLastAttendee(payload.attendee || null);
      waitingForNextRef.current = true;
      setWaitingForNext(true);
      setStatusMessage(payload.message || 'Attendee validated. Tap "Scan Next Attendee" to continue.');
    } catch (error) {
      setStatusMessage(error.message || 'Failed to validate attendee QR.');
    } finally {
      isProcessingRef.current = false;
    }
  };

  if (!permission) {
    return <View style={styles.container}><Text style={styles.status}>Requesting camera permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.status}>Camera permission is required to scan attendee QR codes.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Allow Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Scanner Check-In</Text>
          <Text style={styles.subtitle}>{normalizedEventName || normalizedEventId}</Text>
        </View>
      </View>

      <View style={styles.cameraCard}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={waitingForNext ? undefined : ({ data }) => processScan(data)}
        />
      </View>

      <Text style={styles.status}>{statusMessage}</Text>

      {lastAttendee && (
        <View style={styles.attendeeCard}>
          <Text style={styles.attendeeTitle}>Last Valid Attendee</Text>
          <Text style={styles.attendeeText}>Name: {lastAttendee.name}</Text>
          <Text style={styles.attendeeText}>Email: {lastAttendee.email}</Text>
          <Text style={styles.attendeeText}>Faculty: {lastAttendee.faculty || 'N/A'}</Text>
          <Text style={styles.attendeeText}>ID: {lastAttendee.id}</Text>
        </View>
      )}

      <View style={styles.manualRow}>
        <TextInput
          style={styles.input}
          value={manualQr}
          onChangeText={setManualQr}
          placeholder="Paste QR text / redeem-ticket URL"
          editable={!waitingForNext}
        />
        <TouchableOpacity
          style={[styles.validateBtn, (waitingForNext || !manualQr.trim()) && styles.disabledBtn]}
          onPress={() => {
            processScan(manualQr);
            setManualQr('');
          }}
          disabled={waitingForNext || !manualQr.trim()}
        >
          <Text style={styles.validateBtnText}>Validate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.nextScanBtn, !waitingForNext && styles.disabledBtn]}
          onPress={handleScanNextAttendee}
          disabled={!waitingForNext}
        >
          <Text style={styles.nextScanBtnText}>Scan Next Attendee</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>Done and Logout</Text>
        </TouchableOpacity>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f8fc', paddingBottom: 16 },
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
  title: { fontSize: 18, fontWeight: '800', color: '#0b4f78' },
  subtitle: { color: '#64748b', fontSize: 12, marginTop: 2 },
  cameraCard: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe7f3',
    backgroundColor: '#fff',
  },
  camera: { width: '100%', height: 280 },
  status: { paddingHorizontal: 16, color: '#0f172a', fontWeight: '600' },
  attendeeCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 12,
    padding: 12,
  },
  attendeeTitle: { color: '#166534', fontWeight: '800', marginBottom: 6 },
  attendeeText: { color: '#14532d' },
  manualRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  validateBtn: {
    borderRadius: 10,
    backgroundColor: '#1d4ed8',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  validateBtnText: { color: '#fff', fontWeight: '700' },
  disabledBtn: {
    backgroundColor: '#94a3b8',
  },
  actionRow: {
    marginTop: 12,
    marginHorizontal: 16,
    gap: 10,
  },
  nextScanBtn: {
    borderRadius: 10,
    backgroundColor: '#0ea5e9',
    alignItems: 'center',
    paddingVertical: 11,
  },
  nextScanBtnText: { color: '#fff', fontWeight: '700' },
  logoutBtn: {
    borderRadius: 10,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    alignItems: 'center',
    paddingVertical: 11,
  },
  logoutBtnText: { color: '#be123c', fontWeight: '700' },
  primaryBtn: {
    marginTop: 12,
    borderRadius: 10,
    backgroundColor: '#0b4f78',
    alignItems: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700' },
});
