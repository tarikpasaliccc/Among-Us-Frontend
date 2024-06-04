import "./chat.css";
import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../../../Context/WebSocketContext";
import axios from "axios";

const Chat = ({ onClose, chatHistory, setChatHistory, onNewMessage }) => {
    const stompClientRef = useRef(null);
    const { stompClient: emergencyStompClient, isConnected } = useWebSocket();
    const sessionId = sessionStorage.getItem('sessionId');
    const token = sessionStorage.getItem('jwtToken');
    const roomId = sessionStorage.getItem('roomId');
    const playerId = sessionStorage.getItem('playerId');
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');

    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchChatHistory = async () => {
            console.log('Fetching chat history for room:', roomId)
            try {
                const response = await axios.get(`http://localhost:8083/api/chat/getChatHistory/${roomId}`);
                console.log('Chat history:', response.data);
                setChatHistory(response.data);
            } catch (error) {
                console.error('Error fetching chat history:', error);
            }
        };

        fetchChatHistory().then(r => console.log('Fetched chat history'));

        if (isConnected) {
            emergencyStompClient.subscribe(`/topic/emergencyMeeting/${roomId}`, () => {
                console.log('Joined the emergency meeting chat');
            });
        }

        const socket = new SockJS('http://localhost:8083/ws/chat');
        stompClientRef.current = Stomp.over(socket);

        stompClientRef.current.connect({}, () => {
            stompClientRef.current.subscribe(`/topic/chat/${roomId}`, (message) => {
                const chatMessage = JSON.parse(message.body);
                console.log('Received message: ', chatMessage);
                setChatHistory(prevHistory => [...prevHistory, chatMessage]);
                console.log('New message from ' + chatMessage.sender);
                //onNewMessage(chatMessage.sender);
            });
        });

        return () => {
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.disconnect();
            }
        };
    }, [isConnected, roomId, setChatHistory]);

    const sendMessage = () => {
        if (message.trim() !== '' && stompClientRef.current && stompClientRef.current.connected) {
            const chatMessage = {
                content: message,
                sender: username,
                type: "CHAT",
                roomId: roomId,
            };

            stompClientRef.current.send(`/app/chat/sendMessage/${roomId}`, JSON.stringify(chatMessage), {});
            setMessage('');
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="chat-popup-overlay">
            <div className="chat-popup-box">
                <button className="close-button" onClick={onClose}>X</button>
                <div className="chat-container">
                    <div className="chat-history">
                        {chatHistory.map((msg, index) => (
                            <div
                                key={index}
                                className={`chat-message ${msg.sender === username ? 'own-message' : 'other-player-message'}`}
                            >
                                <div className="text-message">
                                    <strong>{msg.sender === username ? 'You' : msg.sender}</strong>
                                    <br /> {msg.content}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="chat-input">
                        <input
                            className="chat-input-field"
                            type="text"
                            placeholder="Enter your message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={handleKeyPress}
                        />
                        <button className="chat-button" onClick={sendMessage}>Send</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
