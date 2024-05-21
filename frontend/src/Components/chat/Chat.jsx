import "./chat.css";
import { useEffect, useRef, useState } from "react";
import SockJS from "sockjs-client";
import Stomp from "webstomp-client";
import { useNavigate } from "react-router-dom";
import {useWebSocket} from "../../Context/WebSocketContext";

const Chat = () => {
    const stompClientRef = useRef(null);
    const { stompClient: emergencyStompClient, isConnected } = useWebSocket();
    const sessionId = sessionStorage.getItem('sessionId');
    const token = sessionStorage.getItem('jwtToken');
    const roomId = sessionStorage.getItem('roomId');
    const playerId = sessionStorage.getItem('playerId');
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');
    const players = [];

    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([]);

    useEffect(() => {
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
            });
        });

        return () => {
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.disconnect();
            }
        };
    }, [roomId, username]);

    const sendMessage = () => {
        if (message.trim() !== '' && stompClientRef.current && stompClientRef.current.connected) {
            const chatMessage = {
                content: message,
                sender: username,
                type: "CHAT",
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

    function votePlayer(id) {

    }

    return (
        <div className="main-container">
            <div className="chat-container">
                <div className="chat-history">
                    {chatHistory.map((msg, index) => (
                        <div key={index} className={`chat-message ${msg.sender === username ? 'own-message' : 'other-player-message'}`}>
                            <div className="text-message">
                                <strong>{msg.sender === username ? 'You' : msg.sender}</strong>
                                <br /> {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
                <div className="chat-input">
                    <input
                        type="text"
                        placeholder="Enter your message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={handleKeyPress}
                    />
                    <button onClick={sendMessage}>Send</button>
                </div>
            </div>
            <div className="voting-container">
                {players.map((player, index) => (
                    <div key={index} className="player-card" onClick={() => votePlayer(player.id)}>
                        <img src={player.avatar} alt={`${player.name} avatar`} />
                        <div className="player-name">{player.name}</div>
                    </div>
                ))}
            </div>
        </div>
    );


};

export default Chat;
