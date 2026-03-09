import { Ionicons } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import Feather from '@expo/vector-icons/Feather';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import SimpleLineIcons from '@expo/vector-icons/SimpleLineIcons';
import * as Notifications from 'expo-notifications';
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useOrgaDash } from '../../hooks/organiser/useOrgaDash';



export default function Organiser() {

  const dashData = useOrgaDash();
  const stats = dashData?.stats || {};
  const notifications = dashData?.notifications || [];
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const router = useRouter();



  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowAlert: true,
    })
  });



  useEffect(() => {
    const requestPermissin = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Permission not granted!');

      }
    }
    requestPermissin();
  });

  useEffect(() => {
    navigation.setOptions({
      header: () => (
        <View style={style.headerContainer}>
          <View style={style.row}>
            <TouchableOpacity onPress={() => console.log('Notifications pressed')}>
              <Image source={require('@/assets/images/TUT-Logo1.jpg')} style={style.logo} />

            </TouchableOpacity>
            <Text style={style.title}>Dashboard</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(!isNotificationOpen)}>
              <Ionicons name="notifications-outline" size={26} color="black" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.replace("/(tabs)/Organiser/Profile")}>
              <Image source={require('@/assets/images/pp.jpg')} style={style.logo2} />
            </TouchableOpacity>
          </View>


        </View>
      ),
    });


  },);

  return (
    <View style={style.container}>

      {isNotificationOpen && (
        <View style={style.notificationDropdown}>
          <View style={style.notificationHeader}>
            <Text style={style.notificationTitle}>Notifications</Text>
            <TouchableOpacity onPress={() => setIsNotificationOpen(false)}>
              <AntDesign name="close" size={16} color="#999" />
            </TouchableOpacity>
          </View>

          {notifications.length === 0 ? (
            <Text style={style.emptyText}>No new notifications</Text>
          ) : (
            <ScrollView style={style.notificationList}>
              {notifications.map((item) => (
                <View key={item.id} style={style.notificationItem}>
                  <View style={style.notificationIcon}>
                    <Ionicons name="information-circle-outline" size={20} color="#0077B6" />
                  </View>
                  <View style={style.notificationContent}>
                    <Text style={style.notificationItemTitle}>{item.title}</Text>
                    <Text style={style.notificationItemMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <Text style={style.notificationTime}>{item.time}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}
      <ScrollView style={style.container2}
        onTouchStart={() => isNotificationOpen && setIsNotificationOpen(false)}
      >
        <Text style={style.text1}>Welcome Organiser</Text>
        <Text style={style.text2}>Dashboard Overview</Text>

        <View style={style.box}>
          <View style={style.box1}>
            <View style={style.box12}>
              <View>
                <Text style={style.text5}>Total Events</Text>
                <Text style={style.number}>{stats.totalEvents?.value || '0'}</Text>
              </View>
              <FontAwesome name="calendar-check-o" size={20} color="#0077B6" style={style.logo1} />

            </View>
            <View style={style.persentBox}>



            </View>
          </View>
          <View style={style.box2}>
            <View style={style.box12}>
              <View>
                <Text style={style.text5}>Total Registartions</Text>
                <Text style={style.number}>{stats.totalRegistrations?.value || '0'}</Text>
              </View>
              <SimpleLineIcons name="people" size={20} color="black" style={style.logo1} />
            </View>
            <View style={style.persentBox}>



            </View>
          </View>
          <View style={style.box3}>
            <View style={style.box12}>
              <View>
                <Text style={style.text5}>Resource Utilized</Text>
                <Text style={style.number}>{stats.resourceUtilized?.value || '0'}</Text>
              </View>
              <SimpleLineIcons name="settings" size={20} color="black" style={style.logo1} />
            </View>
            <View style={style.persentBox}>
              <Feather
                name={stats.resourceUtilized?.change?.type === 'increase' ? 'arrow-up-right' : 'arrow-down-left'}
                size={12} color="#999"
              />
              <Text style={style.persent}>{stats.resourceUtilized?.change?.amount || '0'}</Text>
              <Text style={style.persent}>% {stats.resourceUtilized?.change?.type || ''}</Text>
            </View>
          </View>
          <View style={style.box4}>
            <View style={style.box12}>
              <View>
                <Text style={style.text5}>Average Rating</Text>
                <Text style={style.number}>{stats.averageRating?.value || '0'}</Text>
              </View>
              <Feather name="star" size={20} color="#e9d700" style={style.logo1} />
            </View>
            <View style={style.persentBox}>
              <Feather
                name={stats.averageRating?.change?.type === 'increase' ? 'arrow-up-right' : 'arrow-down-left'}
                size={12} color="#999"
              />
              <Text style={style.persent}>{stats.averageRating?.change?.amount || '0'}</Text>
              <Text style={style.persent}>% {stats.averageRating?.change?.type || ''}</Text>
            </View>
          </View>
        </View>



        <Text style={[style.text8, { marginTop: 40 }]}>Quick Actions</Text>
        <TouchableOpacity style={style.searchBar2} onPress={() => router.replace("/(tabs)/Organiser/Create")}>
          <AntDesign name="plus" size={16} color="black" />
          <Text style={style.text3}>Create New Event</Text>
        </TouchableOpacity>


        {/* NEW: Upload Document Button */}
        <TouchableOpacity style={style.searchBar2} onPress={() => router.replace("/(tabs)/Organiser/UploadDocument")}>
          <Feather name="upload" size={16} color="black" />
          <Text style={style.text4}>Upload Document</Text>
        </TouchableOpacity>



      </ScrollView>

    </View>
  );
}

const style = StyleSheet.create({
  notificationDropdown: {
    position: 'absolute',
    top: -90, // Adjust based on your header height (~status bar + header)
    right: 9,
    width: 300,
    maxHeight: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
    padding: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  emptyText: {
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    marginRight: 12,
    marginTop: 4,
  },
  notificationContent: {
    flex: 1,
  },
  notificationItemTitle: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
  },
  notificationItemMessage: {
    fontSize: 13,
    color: '#666',
    marginVertical: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#999',
  },
  persent: {
    fontSize: 10,
    color: "#999",

  }, persentBox: {
    flexDirection: 'row',
    marginTop: "auto",
    marginBottom: 20,

  },
  logo1: {
    marginRight: 12,
  },
  box12: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  number: {
    fontSize: 28,
    fontWeight: '600',
    marginTop: 5,
    marginLeft: 5,
    color: "#333",
  },
  text3: {
    marginLeft: 12,
  }, text4: {
    marginLeft: 12,
  },
  box: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginTop: 20,
    marginBottom: 20,
  },
  box1: {
    backgroundColor: '#fafafaff',
    width: 165,
    height: 130,
    marginTop: 10,

  },
  box2: {
    backgroundColor: '#fafafaff',
    width: 165,
    height: 130,
    marginTop: 10,
  },
  box3: {
    backgroundColor: '#fafafaff',
    width: 165,
    height: 130,
    marginTop: 15,
  },
  box4: {
    backgroundColor: '#fafafaff',
    width: 165,
    height: 130,
    marginTop: 15,
  },
  text1: {
    fontSize: 18,
    fontWeight: '300',
    color: "#999",
    marginTop: 20,
  },
  text5: {
    fontSize: 15,
    fontWeight: '300',
    color: "#999",
    marginTop: 9,
  },
  text2: {
    marginTop: 5,
    fontSize: 28,
    fontWeight: '600'
  },
  text8: {
    marginTop: 5,
    fontSize: 25,
    marginBottom: 5,
    fontWeight: '600'
  },
  container2: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',          // icon + text side by side
    alignItems: 'center',          // vertically align
    backgroundColor: '#f2f2f2',    // light background
    borderRadius: 20,              // rounded look
    paddingHorizontal: 12,
    margin: 5,
    height: 45,
  }, searchBar2: {
    flexDirection: 'row',          // icon + text side by side
    alignItems: 'center',          // vertically align
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#f2f2f2',    // light background
    borderRadius: 12,              // rounded look
    paddingHorizontal: 20,
    margin: 5,
    height: 45,

  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingLeft: 20,
    paddingRight: 20,
  }, headerContainer: {
    paddingHorizontal: 15,
    paddingTop: 55, // for status bar spacing (adjust if using SafeArea)
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  input: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRadius: 8,
    fontSize: 16,
    outlineStyle: 'none',
  }, logo: {
    width: 40,
    height: 40,
    marginLeft: 30
  }, logo2: {
    width: 40,
    height: 40,
    marginLeft: 10,
    marginRight: 10,
  }

});