import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const emergencyStompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const gameRoomStompClientRef = useRef(null);
    const [isGameRoomConnected, setIsGameRoomConnected] = useState(false);

    const movementStompClientRef = useRef(null);
    const [isMovementConnected, setIsMovementConnected] = useState(false);

    const connect = useCallback((clientRef, url, setConnected) => {
        const client = new Client({
            webSocketFactory: () => new SockJS(url),
            reconnectDelay: 5000,
            onConnect: () => {
                console.log(`Connected to ${url}`);
                setConnected(true);
                clientRef.current = client;  // Ensure the client is set after connection
            },
            onStompError: (error) => {
                console.error(`STOMP error: ${error}`);
                setConnected(false);
                setTimeout(() => connect(clientRef, url, setConnected), 5000);
            },
            onWebSocketClose: () => {
                console.log(`Disconnected from ${url}`);
                setConnected(false);
                setTimeout(() => connect(clientRef, url, setConnected), 5000);
            }
        });

        client.activate();
    }, []);

    useEffect(() => {
        connect(emergencyStompClientRef, 'http://localhost:8083/ws/emergencyMeeting', setIsConnected);
        connect(gameRoomStompClientRef, 'http://localhost:8081/ws/gameRoom', setIsGameRoomConnected);
        connect(movementStompClientRef, 'http://localhost:8082/ws/movement', setIsMovementConnected);

        const emergencyClient = emergencyStompClientRef.current;
        const gameRoomClient = gameRoomStompClientRef.current;
        const movementClient = movementStompClientRef.current;

        return () => {
            if (emergencyClient) {
                emergencyClient.deactivate();
            }
            if (gameRoomClient) {
                gameRoomClient.deactivate();
            }
            if (movementClient) {
                movementClient.deactivate();
            }
        };
    }, [connect]);

    return (
        <WebSocketContext.Provider value={{
            emergencyStompClient: emergencyStompClientRef.current, isConnected,
            gameRoomStompClient: gameRoomStompClientRef.current, isGameRoomConnected,
            movementStompClient: movementStompClientRef.current, isMovementConnected
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};
