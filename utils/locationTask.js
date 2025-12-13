import socket from '@/utils/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';

const LOCATION_TASK_NAME = 'background-location-task';
const BUS_INFO_KEY = 'BUS_INFO';




TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
    // console.log('⏱️ LOCATION_TASK invoked', { hasData: !!data, locationsCount: data?.locations?.length ?? 0, time: new Date(data.locations[0].timestamp).toLocaleTimeString() });

    if (error) {
        console.error('Location task error:', error);
        return;
    }

    if (!data || !data.locations || data.locations.length === 0) {
        console.log('No locations received in background task', { data });
        return;
    }

    try {
        const { locations } = data;
        const location = locations[0];

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

        // console.log('Background payload:', payload, new Date(payload.timestamp).toLocaleTimeString());

        try {
            if (socket && socket.connected) {
                socket.emit('busUpdate', payload);
            } else {                
                // Force disconnect and reconnect
                if (socket?.disconnected) {
                    socket.disconnect();
                }
                socket.connect();
                
                const connectionPromise = new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('Connection timeout after 8 seconds'));
                    }, 8000); // 8 second timeout
                    
                    const onConnect = () => {
                        clearTimeout(timeout);
                        socket.off('connect', onConnect);
                        socket.off('connect_error', onConnectError);
                        resolve();
                    };
                    
                    const onConnectError = (error) => {
                        console.error('Connection error details:', error);
                        clearTimeout(timeout);
                        socket.off('connect', onConnect);
                        socket.off('connect_error', onConnectError);
                        reject(error);
                    };
                    
                    socket.on('connect', onConnect);
                    socket.on('connect_error', onConnectError);
                });
                
                try {
                    await connectionPromise;
                    socket.emit('busUpdate', payload);
                } catch (connectionErr) {
                    console.error('✗ Failed to reconnect socket:', connectionErr?.message, 'Server might be down');
                }
            }
        } catch (emitErr) {
            console.error('Error in socket emit:', emitErr);
        }

    } catch (e) {
        console.error('Error in location task handler:', e);
    }
});

export { LOCATION_TASK_NAME };

