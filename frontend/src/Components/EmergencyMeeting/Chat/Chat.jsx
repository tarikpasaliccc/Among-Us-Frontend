import "./chat.css";
import { useEffect, useState } from "react";
import { useWebSocket } from "../../../Context/WebSocketContext";
import axios from "axios";

const Chat = ({ onClose, chatHistory, setChatHistory, isPlayerAlive }) => {
    const { emergencyStompClient, isConnected } = useWebSocket();
    const roomId = sessionStorage.getItem('roomId');
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
                setChatHistory([]);
                console.log('Joined the emergency meeting chat');
            });

            emergencyStompClient.subscribe(`/topic/chat/${roomId}`, (message) => {
                const chatMessage = JSON.parse(message.body);
                console.log('Received message: ', chatMessage);
                setChatHistory(prevHistory => [...prevHistory, chatMessage]);
                console.log('New message from ' + chatMessage.sender);
            });

        }

        return () => {
        };
    }, [isConnected, roomId, setChatHistory, emergencyStompClient]);


    const sendMessage = () => {
        if (message.trim() !== '' && isConnected) {
            const chatMessage = {
                content: message,
                sender: username,
                type: "CHAT",
                roomId: roomId,
            };

            emergencyStompClient.publish({
                destination: `/app/chat/sendMessage/${roomId}`,
                body: JSON.stringify(chatMessage)}
            );
            setMessage('');
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && isPlayerAlive) {
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
                            disabled={isPlayerAlive ===! 'ALIVE'}
                        />
                        <button className="chat-button" onClick={sendMessage} disabled={isPlayerAlive ===! 'ALIVE'}>Send</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Chat;
