import socket from '@/utils/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';
const BUS_INFO_KEY = 'BUS_INFO';


const stored = await AsyncStorage.getItem(BUS_INFO_KEY);
const busInfo = stored ? JSON.parse(stored) : null;

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

        console.log(payload, new Date(payload.timestamp).toLocaleTimeString())

        // Emit over socket if connected
        if (socket && socket.connected) {
            socket.emit('busUpdate', payload);
        } else {
            console.log('✗ Socket not connected, skipping payload:', payload);
        }

    } catch (e) {
        console.error('Error in location task handler:', e);
    }
});

export { LOCATION_TASK_NAME };

