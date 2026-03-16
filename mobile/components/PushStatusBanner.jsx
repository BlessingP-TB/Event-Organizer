import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';

const isPhysicalDevice = () => {
  if (typeof Constants.isDevice === 'boolean') {
    return Constants.isDevice;
  }

  return Platform.OS !== 'web';
};

const resolveProjectId = () => {
  return (
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.expoConfig?.extra?.projectId ||
    Constants.manifest2?.extra?.eas?.projectId ||
    Constants.manifest2?.extra?.projectId ||
    Constants.manifest?.extra?.eas?.projectId ||
    Constants.manifest?.extra?.projectId ||
    Constants.easConfig?.projectId ||
    null
  );
};

export const PushStatusBanner = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        if (!isPhysicalDevice()) {
          setStatus({
            type: 'simulator',
            message: 'Simulator detected - push notifications are unavailable',
            color: '#FFA500',
          });
          setLoading(false);
          return;
        }

        const { status: permissionStatus } = await Notifications.getPermissionsAsync();
        if (permissionStatus !== 'granted') {
          setStatus({
            type: 'permission',
            message: 'Notification permission required - allow notifications in Settings',
            color: '#FFA500',
          });
          setLoading(false);
          return;
        }

        if (Constants.appOwnership === 'expo' && Platform.OS === 'android') {
          setStatus({
            type: 'expo-go-android',
            message: 'Expo Go on Android does not support remote push. Use a development build.',
            color: '#FF6B6B',
          });
          setLoading(false);
          return;
        }

        const projectId = resolveProjectId();
        if (!projectId) {
          setStatus({
            type: 'project-id-missing',
            message: 'Push not configured: set EXPO_PUBLIC_EAS_PROJECT_ID and restart the app.',
            color: '#FF6B6B',
          });
          setLoading(false);
          return;
        }

        setStatus({
          type: 'ready',
          message: 'Push notifications ready',
          color: '#4CAF50',
        });
      } catch (_error) {
        setStatus({
          type: 'error',
          message: 'Push status check failed',
          color: '#FF6B6B',
        });
      } finally {
        setLoading(false);
      }
    };

    checkPushStatus();
  }, []);

  if (loading) {
    return (
      <View style={[styles.banner, { backgroundColor: '#E3F2FD' }]}>
        <ActivityIndicator size="small" color="#2196F3" />
        <Text style={[styles.text, { color: '#2196F3' }]}>Checking push status...</Text>
      </View>
    );
  }

  if (!status || status.type === 'ready') {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: status.color }]}>
      <Text style={styles.text}>{status.message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  text: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center'
  }
});
