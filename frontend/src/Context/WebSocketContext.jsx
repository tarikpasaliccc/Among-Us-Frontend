import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const emergencyStompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    const gameRoomStompClientRef = useRef(null);
    const [isGameRoomConnected, setIsGameRoomConnected] = useState(false);

    useEffect(() => {
        const emergencySocket = new SockJS('http://localhost:8083/ws/chat');
        emergencyStompClientRef.current = Stomp.over(emergencySocket);
        emergencyStompClientRef.current.connect({}, () => {
            setIsConnected(true);
        });

        const gameRoomSocket = new SockJS('http://localhost:8081/ws/gameRoom');
        gameRoomStompClientRef.current = Stomp.over(gameRoomSocket);
        gameRoomStompClientRef.current.connect({}, () => {
            setIsGameRoomConnected(true);
        });

        return () => {
            if (emergencyStompClientRef.current) {
                emergencyStompClientRef.current.disconnect();
            }
            if (gameRoomStompClientRef.current) {
                gameRoomStompClientRef.current.disconnect();
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{
            emergencyStompClient: emergencyStompClientRef.current, isConnected,
            gameRoomStompClient: gameRoomStompClientRef.current, isGameRoomConnected
        }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};
