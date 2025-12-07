import { LOCATION_TASK_NAME } from '@/utils/locationTask'; // make sure this exists
import socket from '@/utils/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from 'react';

import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';


type LocationType = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy: number;
};

export default function BusLocationScreen() {
  const { busNo, routeNo, busId } = useLocalSearchParams();
  const [isTracking, setIsTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkIfTracking();
    requestPermissions();
  }, []);

  const checkIfTracking = async () => {
    if (!Location || typeof (Location as any).hasStartedLocationUpdatesAsync !== 'function') {
      console.warn('hasStartedLocationUpdatesAsync is not available in this environment');
      setIsTracking(false);
      return;
    }

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
      } catch (e) {
        console.warn('Failed to store bus info for background task', e);
      }

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.High,
        timeInterval: 10000,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Location Tracking',
          notificationBody: 'Your location is being tracked'
        },
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true
      });

      // foreground tracking (optional but useful)
      if (typeof (Location as any).watchPositionAsync === 'function') {
        await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10
          },
          (loc) => {
            const data = {
              latitude: loc.coords.latitude ?? 0,
              longitude: loc.coords.longitude ?? 0,
              timestamp: loc.timestamp ?? 0,
              accuracy: loc.coords.accuracy ?? 0
            };
            setCurrentLocation(data);
          }
        );
      } else {
        console.warn('watchPositionAsync not available in this environment');
      }

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
        setCurrentLocation(null);
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
      setCurrentLocation(null);
      Alert.alert('Success', 'Tracking stopped');
    } catch (error) {
      console.log(error);
      Alert.alert('Error', 'Failed to stop tracking');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerBox}>
        <Text style={styles.headerTitle}>RouteX Location Tracker</Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Bus No</Text>
            <Text style={styles.badgeValue}>{busNo}</Text>
          </View>

          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>Route No</Text>
            <Text style={styles.badgeValue}>{routeNo}</Text>
          </View>
        </View>
      </View>
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: isTracking ? '#4CAF50' : '#f44336' }
          ]}
        />
        <Text style={styles.statusText}>
          {isTracking ? 'Tracking Active' : 'Tracking Inactive'}
        </Text>
      </View>

      {currentLocation && (
        <View style={styles.locationContainer}>
          <Text style={styles.locationLabel}>Current Location:</Text>
          <Text style={styles.locationText}>
            Lat: {currentLocation.latitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Lng: {currentLocation.longitude.toFixed(6)}
          </Text>
          <Text style={styles.locationText}>
            Accuracy: {currentLocation.accuracy?.toFixed(2)} m
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
  );
}

const styles = StyleSheet.create({
  headerBox: {
    width: '100%',
    marginBottom: 30,
    paddingVertical: 10,
    alignItems: 'center'
  },

  headerTitle: {
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

    shadowColor: '#FF003C',
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
  container: {
    flex: 1,
    backgroundColor: '#0B0B0D',   // deep dark
    padding: 20,
    paddingTop: 60
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
    marginRight: 10
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
    backgroundColor: '#A1111F', // darker red
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
  }
});
