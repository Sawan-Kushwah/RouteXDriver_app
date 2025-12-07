import socket from '@/utils/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';
const BUS_INFO_KEY = 'BUS_INFO';
const LAST_TIMESTAMP_KEY = 'LAST_EMITTED_TIMESTAMP';

// Define the background task
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    if (error) {
        console.error('Location task error:', error);
        return;
    }

    if (!data || !data.locations || data.locations.length === 0) {
        return;
    }

    try {
        const { locations } = data;
        const location = locations[0];

        // Check if this timestamp was already emitted
        const lastTimestamp = await AsyncStorage.getItem(LAST_TIMESTAMP_KEY);
        if (lastTimestamp && parseInt(lastTimestamp) === location.timestamp) {
            return;
        }

        const stored = await AsyncStorage.getItem(BUS_INFO_KEY);
        const busInfo = stored ? JSON.parse(stored) : null;

        const payload = {
            lat: location.coords.latitude,
            lng: location.coords.longitude,
            timestamp: location.timestamp,
            accuracy: location.coords.accuracy,
            busNo: busInfo?.busNo ?? null,
            busId: busInfo?.busId ?? null,
            routeNo: busInfo?.routeNo ?? null,
            speed: location.coords.speed ?? null,
        };

        // Emit over socket if connected
        try {
            if (socket && socket.connected) {
                socket.emit('busUpdate', payload);
                await AsyncStorage.setItem(LAST_TIMESTAMP_KEY, location.timestamp.toString());
            } else {
                console.log('✗ Socket not connected, skipping payload:', payload);
            }
        } catch (emitErr) {
            console.error('Failed to emit socket event from background task:', emitErr);
        }
    } catch (e) {
        console.error('Error in location task handler:', e);
    }
});

export { LOCATION_TASK_NAME };

