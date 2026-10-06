import { io, Socket } from "socket.io-client";
import { API_URL } from "../constants/config";
import { getAuthToken } from "./api";

let socket: Socket | null = null;

// Opens the live connection to the backend (only once)
export function connectSocket(): Socket {
    if (socket) return socket;
    socket = io(API_URL, {
        // The token is read again on every (re)connect
        auth: (cb) => cb({ token: getAuthToken() }),
        transports: ["websocket"],
    });
    return socket;
}

export function disconnectSocket() {
    if (socket) socket.disconnect();
    socket = null;
}