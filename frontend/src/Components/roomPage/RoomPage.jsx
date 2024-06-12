import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import axios from "axios";
import './roomPage.css';
import reloadImage from './reloadbtn.png';
import exitImage from './exit-btn.png';
import { useWebSocket } from '../../Context/WebSocketContext';

function RoomPage() {
    const { roomId } = useParams();
    const [players, setPlayers] = useState([]);
    const navigate = useNavigate();
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const username = sessionStorage.getItem('username');
    const [hostSessionsId, setHostSessionsId] = useState(null);

    const videoRef = useRef(null);
    const { gameRoomStompClient, isGameRoomConnected } = useWebSocket();

    const fetchRoomData = useCallback(async () => {
        try {
            console.log('Fetching room data for room:', roomId);
            const response = await axios.get(`http://localhost:8081/api/gameRooms/getGameRoom/${roomId}`);
            console.log('Room data:', response);
            setPlayers(response.data.players);
            setHostSessionsId(response.data.createdBy);
        } catch (error) {
            console.error('Error fetching room data:', error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchRoomData().then(() => console.log('Fetched room data'));
    }, [fetchRoomData]);

    useEffect(() => {
        if (isGameRoomConnected && gameRoomStompClient.connected) {
            const subscription = gameRoomStompClient.subscribe(`/topic/startGame/${roomId}`, (message) => {
                const data = JSON.parse(message.body);
                console.log('Redirecting to the loading Screen with this data:', data);
                sessionStorage.setItem('rolesList', JSON.stringify(data.rolesList));
                sessionStorage.setItem('playerStatus', 'ALIVE');
                sessionStorage.setItem('roomId', roomId);
                navigate('/loadingScreen');
            });

            return () => {
                if (subscription) {
                    subscription.unsubscribe();
                }
            };
        }
    }, [isGameRoomConnected, gameRoomStompClient, navigate, roomId]);

    const refreshPlayers = () => {
        fetchRoomData().then(() => console.log('Refreshed players'));
    };

    function handleLeaveRoom() {
        async function leaveRoom() {
            try {
                await axios.post('http://localhost:8081/api/gameRooms/leaveGameRoom', {
                    roomId: roomId,
                    playerId: playerId,
                    username: username,
                });
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        }
        leaveRoom().then(() => console.log('Left room successfully'));
        navigate('/rooms');
    }

    const handleStartGame = async () => {
        sessionStorage.setItem('roomId', roomId);

        try {
            const response = await axios.post(`http://localhost:8081/api/gameRooms/assignRoles/${roomId}`);
            console.log('Starting game for room:', roomId);
            const rolesList = response.data.players;
            sessionStorage.setItem('rolesList', JSON.stringify(rolesList));
            sessionStorage.setItem('playerStatus', 'ALIVE');

            if (isGameRoomConnected && gameRoomStompClient.connected) {
                console.log('Starting game for room:', roomId);
                console.log('Player ID:', playerId);
                console.log('Username:', username);

                gameRoomStompClient.publish({
                    destination: '/app/startGame',
                    body: JSON.stringify({
                        roomId: roomId,
                        playerId: playerId,
                        username: username,
                    })
                });

                gameRoomStompClient.publish({
                    destination: '/app/join',
                    body: JSON.stringify({
                        roomId: roomId,
                        playerId: playerId,
                        username: username,
                    })
                });

                // Broadcast to all clients in the room
                gameRoomStompClient.publish({
                    destination: `/topic/startGame/${roomId}`,
                    body: JSON.stringify({rolesList})
                });

                // Wait for confirmation or a short delay to ensure the message is sent
                await new Promise((resolve) => setTimeout(resolve, 500));

                navigate('/loadingScreen');
            } else {
                console.error('WebSocket is not connected.');
            }
        } catch (error) {
            console.error('Error starting game:', error);
        }
    }

    const isHost = hostSessionsId === sessionId;
    const isStartGameEnabled = isHost && players.length >= 4;

    return (
        <div className="room-page">
            <video ref={videoRef} autoPlay loop muted playsInline className="video-background">
                <source src="/list-background.mp4" type="video/mp4"/>
                Your browser does not support the video tag.
            </video>
            <div className="top-bar">
                <h2 className="roomID">ROOM ID: {roomId}</h2>
                <h1 className="crew-text">THE CREW</h1>
                <img src={reloadImage} alt="Reload" className="refresh-btn" onClick={refreshPlayers}/>
            </div>
            <img src={exitImage} alt="Exit" className="exit-btn" onClick={handleLeaveRoom}/>
            <div className="player-cards">
                {players.length === 0 ? (
                    <p>No players in this room</p>
                ) : (
                    players.map((player, index) => (
                        <div className="player-card" key={index}>
                            <div className="player-icon"></div>
                            <span className="player-username">{player.username}</span>
                        </div>
                    ))
                )}
            </div>
            <div className="waiting-text"></div>
            <div className="button-container-rooms">
                <button
                    className="start-game-btn"
                    onClick={handleStartGame}
                    // disabled={!isStartGameEnabled}
                >
                    start
                </button>
            </div>
        </div>
    );
}

export default RoomPage;
