import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Stomp } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const emergencyStompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const emergencySocket = new SockJS('http://localhost:8083/ws/chat');
        emergencyStompClientRef.current = Stomp.over(emergencySocket);
        emergencyStompClientRef.current.connect({}, () => {
            setIsConnected(true);
        });

        return () => {
            if (emergencyStompClientRef.current) {
                emergencyStompClientRef.current.disconnect();
            }
        };
    }, []);

    return (
        <WebSocketContext.Provider value={{ stompClient: emergencyStompClientRef.current, isConnected }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};
