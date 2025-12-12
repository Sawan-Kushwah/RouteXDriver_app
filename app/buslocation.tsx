import { LOCATION_TASK_NAME } from '@/utils/locationTask'; // make sure this exists
import socket from '@/utils/socketService';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


type BusInfoType = {
  busNo: string | number;
  routeNo: string | number;
  busId: string;
};

export default function BusLocationScreen() {
  const { busNo, routeNo, busId } = useLocalSearchParams();
  const [isTracking, setIsTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTrackedBus, setCurrentTrackedBus] = useState<BusInfoType | null>(null)
  const [useremail, setUseremail] = useState<string | null>(null);


  useEffect(() => {
    checkIfTracking();
    requestPermissions();
    getUserDetails();
  }, []);

  const checkIfTracking = async () => {
    if (!Location || typeof (Location as any).hasStartedLocationUpdatesAsync !== 'function') {
      console.warn('hasStartedLocationUpdatesAsync is not available in this environment');
      setIsTracking(false);
      return;
    }

    const stored = await AsyncStorage.getItem('BUS_INFO');
    const busInfo = stored ? JSON.parse(stored) : null;
    setCurrentTrackedBus(busInfo as BusInfoType)

    const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
    setIsTracking(isTaskRegistered);
  };

  const requestPermissions = async () => {
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== 'granted') {
      Alert.alert('Permission Required', 'Foreground location permission needed.');
      return false;
    }

    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      Alert.alert('Background Permission Required', 'Background location permission needed.');
      return false;
    }

    try {
      await Notifications.requestPermissionsAsync();
    } catch (e) {
      console.warn('Notification permission request failed', e);
    }

    return true;
  };

  const startTracking = async () => {
    setLoading(true);
    socket.connect();
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setLoading(false);
      return;
    }

    try {
      // runtime guard: some environments (web / Expo Go) may not expose background APIs.
      if (!Location || typeof (Location as any).startLocationUpdatesAsync !== 'function') {
        Alert.alert(
          'Not Supported',
          'Background location is not supported in this environment. Build a standalone app or dev client to use background location.'
        );
        setLoading(false);
        return;
      }
      // store bus info for background task to read
      try {
        await AsyncStorage.setItem('BUS_INFO', JSON.stringify({ busNo, busId, routeNo }));
        setCurrentTrackedBus({ busId, busNo, routeNo } as BusInfoType)
      } catch (e) {
        console.warn('Failed to store bus info for background task', e);
      }

      
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        timeInterval: 1000 * 10,
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 1,
        deferredUpdatesInterval: 1000,
        foregroundService: {
          killServiceOnDestroy: false,
          notificationTitle: "RouteX — Tracking active",
          notificationBody:
            `Bus ${busNo} — Route ${routeNo} is sharing location.`,
        },
      });
 

      setIsTracking(true);
      Alert.alert('Success', 'Location tracking started');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to start tracking');
    }

    setLoading(false);
  };

  const stopTracking = async () => {
    setLoading(true);

    try {
      if (!Location || typeof (Location as any).hasStartedLocationUpdatesAsync !== 'function') {
        console.warn('hasStartedLocationUpdatesAsync is not available in this environment');
        setIsTracking(false);
        setLoading(false);
        return;
      }

      const isTaskRegistered = await Location.hasStartedLocationUpdatesAsync(
        LOCATION_TASK_NAME
      );

      if (isTaskRegistered && typeof (Location as any).stopLocationUpdatesAsync === 'function') {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }

      socket.off("busUpdate");
      socket.disconnect();

      // remove stored bus info
      try {
        await AsyncStorage.removeItem('BUS_INFO');
      } catch (e) {
        console.warn('Failed to remove bus info from storage', e);
      }

    
      setIsTracking(false);
      setCurrentTrackedBus(null)
      Alert.alert('Success', 'Tracking stopped');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to stop tracking');
    }

    setLoading(false);
  };

  const handelLogout = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
      await AsyncStorage.removeItem("token_expiry");
      await stopTracking();
      router.replace("/");
    } catch (err) {
      console.log(err);
    }
  }

  const getUserDetails = async () => {
    const store = await AsyncStorage.getItem("user");
    if (store) {
      const parsed = JSON.parse(store);
      setUseremail(parsed?.email)
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View >
        <View >

          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              Route<Text style={styles.redColor}>X</Text>
            </Text>

            <TouchableOpacity style={styles.btn} onPress={handelLogout}>
              <Text style={styles.btnText}>Logout</Text>
            </TouchableOpacity>
          </View>
          <Text style={{ fontSize: 14, color: 'grey', textAlign: "right", position: 'relative', top: -16 }}>Email : {useremail}</Text>
        </View>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle2}>Current Bus & Route Details</Text>

          <View style={styles.badgeRow}>
            <View style={isTracking ? styles.badgeOnTracking : styles.badge}>
              <Text style={styles.badgeLabel}>Bus No</Text>
              <Text style={styles.badgeValue}>{busNo}</Text>
            </View>

            <View style={isTracking ? styles.badgeOnTracking : styles.badge}>
              <Text style={styles.badgeLabel}>Route No</Text>
              <Text style={styles.badgeValue}>{routeNo}</Text>
            </View>
          </View>
        </View>

        {!isTracking &&
          <View style={styles.statusContainer}>
            <View style={styles.statusIndicator} />
            <Text style={styles.statusText}>Tracking Inactive</Text>
          </View>
        }


        {currentTrackedBus && (
          <View style={styles.tickContainer}>
            <Ionicons name="checkmark-circle" size={110} color="#4CAF50" />
            <Text style={styles.tickText}>Location transmission activated</Text>
          </View>
        )}


        {currentTrackedBus && (
          <View style={styles.locationContainer}>
            <Text style={styles.locationLabel}>Live tracking is running for :</Text>
            <Text style={{ color: 'green', fontWeight: 'bold', fontSize: 17, textAlign: 'left' }}>
              Bus No : {currentTrackedBus.busNo}
            </Text>
            <Text style={{ color: 'green', fontWeight: 'bold', fontSize: 17, marginBottom: 10, textAlign: 'right' }}>
              Route No {currentTrackedBus.routeNo}
            </Text>
            <Text style={{ color: 'grey', fontSize: 13, textAlign: 'center' }}>
              Stop it to switch to another bus.
            </Text>
          </View>
        )}


        {loading ? (
          <ActivityIndicator size="large" color="#333" />
        ) : (
          <TouchableOpacity
            style={[
              styles.button,
              isTracking ? styles.stopButton : styles.startButton
            ]}
            onPress={isTracking ? stopTracking : startTracking}
          >
            <Text style={styles.buttonText}>
              {isTracking ? 'Stop Tracking' : 'Start Tracking'}
            </Text>
          </TouchableOpacity>
        )}

        <Text style={styles.infoText}>
          This app tracks your location in the background.
        </Text>
      </View>
      <StatusBar />
    </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0000",
    padding: 16,
    paddingTop: 30
  },

  headerBox: {
    width: '100%',
    marginBottom: 30,
    paddingVertical: 10,
    alignItems: 'center'
  },

  headerTitle2: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 18,
    letterSpacing: 0.4
  },

  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16
  },

  badge: {
    backgroundColor: 'rgba(255,0,50,0.15)',
    borderColor: 'rgba(255,0,50,0.35)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',

    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6
  },

  badgeOnTracking: {
    backgroundColor: 'rgba(22, 248, 45, 0.17)',
    borderColor: 'rgba(0, 255, 47, 0.35)',
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 14,
    minWidth: 100,
    alignItems: 'center',

    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 6
  },

  badgeLabel: {
    color: '#CCCCCC',
    fontSize: 13,
    marginBottom: 4,
    fontWeight: '600',
    letterSpacing: 0.3
  },

  badgeValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.5
  },

  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 35
  },

  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25
  },

  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
    backgroundColor: '#f44336'
  },

  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E4E4E7'  // soft grey
  },

  locationContainer: {
    backgroundColor: '#141417',   // dark card
    padding: 20,
    borderRadius: 14,
    width: '100%',
    marginBottom: 35,
    borderWidth: 1,
    borderColor: 'rgba(255,0,0,0.2)', // subtle red outline
    shadowColor: '#FF3B30',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 4
  },

  locationLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12
  },

  locationText: {
    fontSize: 15,
    color: '#BBBBBB',
    marginBottom: 6
  },

  button: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 30,
    minWidth: 220,
    alignItems: 'center',
    alignSelf: 'center',
    shadowColor: '#FF0000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 6
  },

  startButton: {
    backgroundColor: '#D7263D', // rich red
  },

  stopButton: {
    backgroundColor: '#1ba111ff', // darker red
  },

  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700'
  },

  infoText: {
    marginTop: 25,
    fontSize: 13,
    color: '#888888',
    textAlign: 'center'
  },

  tickContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },

  tickText: {
    marginTop: 8,
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },

  btn: {
    paddingHorizontal: 20,
    paddingVertical: 6,
    backgroundColor: '#e22020ff',
    borderRadius: 6,
  },

  btnText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#fff",
    marginBottom: 10,
  },
  redColor: {
    color: "red",
  },
});
