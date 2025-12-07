import { io } from "socket.io-client";
const server = 'https://routexserver.onrender.com'

const socket = io(server, {
    transports: ["websocket"],
    withCredentials: true,
    forceNew: true,
    reconnection: true,
    rejectUnauthorized: false,
});

export default socket;