import React, { useState, useEffect } from 'react';
import { Link, useNavigation } from "expo-router";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { Platform, View, Text, Image, TouchableOpacity, TextInput, StyleSheet, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { useProfileData } from '../../hooks/useProfileDat';

export default function App() {
  const { data, isLoading, error } = useProfileData();
  const router = useRouter();
  const navigation = useNavigation();

  const [name, setName] = useState('');
  const [image, setImage] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, []);

  useEffect(() => {
    if (data) {
      const finalName =
        data.name ||
        data.user?.name ||
        data.profile?.name ||
        data.userInfo?.find(i => i.label === 'Name')?.value ||
        'User Name Missing';
      setName(finalName);
    }
  }, [data]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Allow access to your photos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    const imageUri = result.assets?.[0]?.uri || result.uri;
    if (imageUri) setImage(imageUri);
  };

  const deleteProfilePic = () => {
    Alert.alert('Delete Profile Picture', 'Are you sure you want to remove your profile picture?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setImage(null) },
    ]);
  };

  const saveChanges = () => {
    setEditing(false);
    Alert.alert('Profile Updated', 'Your profile has been successfully updated!');
  };

  const logout = async () => {
    const confirmLogout = () =>
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("userSession");
            router.replace("/AuthScreen");
          },
        },
      ]);

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to logout?")) {
        await AsyncStorage.removeItem("userSession");
        router.replace("/AuthScreen");
      }
    } else {
      confirmLogout();
    }
  };



  if (isLoading) return <Text style={{ marginTop: 100 }}>Loading profile...</Text>;
  if (error) return <Text style={{ marginTop: 100, color: 'red' }}>{error}</Text>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(tabs)/Organiser/orgaDash")}>
          <MaterialIcons name="arrow-back" size={24} color="#37474f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Picture */}
      <View style={styles.section}>
        <Image
          source={image ? { uri: image } : require('@/assets/images/pp.jpg')}
          style={styles.profilePic}
        />
        <TouchableOpacity style={styles.smallButton} onPress={pickImage}>
          <MaterialIcons name="photo-library" size={20} color="#4a4a4a" />
          <Text style={styles.smallButtonText}>Change Photo</Text>
        </TouchableOpacity>
        {image && (
          <TouchableOpacity
            style={[styles.smallButton, { backgroundColor: '#f5e6e6' }]}
            onPress={deleteProfilePic}
          >
            <MaterialIcons name="delete" size={20} color="#d32f2f" />
            <Text style={[styles.smallButtonText, { color: '#d32f2f' }]}>Delete Photo</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Editable Section */}
      <View style={styles.section}>
        {editing ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name:</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} />
            </View>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#000000ff' }]}
              onPress={saveChanges}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.name}>{name}</Text>
        )}
      </View>




      {/* Logout */}
      {!editing && (
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#000000ff' }]}
            onPress={logout}
          >
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', paddingVertical: 30, backgroundColor: '#f9f9f9', paddingTop: 50 },
  header: { width: '90%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#37474f' },
  section: { width: '90%', alignItems: 'center', marginBottom: 25 },
  profilePic: { width: 130, height: 130, borderRadius: 65, marginBottom: 15, borderWidth: 1, borderColor: '#cfd8dc' },
  smallButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e0e0', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, marginVertical: 5 },
  smallButtonText: { marginLeft: 5, color: '#4a4a4a', fontWeight: '500' },
  inputGroup: { width: '100%', marginBottom: 15 },
  label: { fontWeight: 'bold', marginBottom: 5, color: '#37474f' },
  input: { width: '100%', borderColor: '#cfd8dc', borderWidth: 1, borderRadius: 10, padding: 10, backgroundColor: '#ffffff', color: '#37474f' },
  name: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#37474f' },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 5 },
  linkText: { color: '#0077B6', marginLeft: 5, fontSize: 16 },
  button: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 12, marginVertical: 5, width: '70%', alignItems: 'center' },
  buttonText: { fontWeight: 'bold', fontSize: 16, color: 'white' },
});
