import React, {useCallback, useEffect, useState} from 'react';
import {useNavigate, useParams} from 'react-router-dom';
import axios from "axios";
import './roomPage.css';


function RoomPage() {
    const {roomId} = useParams();
    const [players, setPlayers] = useState([]);
    const navigate = useNavigate();
    const token = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const [hostSessionsId, setHostSessionsId] = useState(null);

    const fetchRoomData = useCallback( async () => {
        try {
            console.log('Fetching room data for room:', roomId)
            const response = await axios.get(`http://localhost:8080/api/gameRooms/getGameRoom/${roomId}`);
            console.log('Room data:', response);
            setPlayers(response.data.players);
            setHostSessionsId(response.data.createdBy);
        } catch (error) {
            console.error('Error fetching room data:', error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchRoomData();
    }, [fetchRoomData]);

    const refreshPlayers = () =>{
        fetchRoomData();
    }


    function handleLeaveRoom() {
        async function leaveRoom() {
            try {
                await axios.post('http://localhost:8080/api/gameRooms/leaveGameRoom', {
                    roomId: roomId,
                    token: token,
                    sessionId: sessionId
                });
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        }
        leaveRoom().then(r => console.log('Left room successfully'));
        navigate('/rooms');
    }

    function handleStartGame() {
        sessionStorage.setItem('roomId', roomId);
        navigate('/loadingScreen');
    }

    const isHost = hostSessionsId === sessionId;
    const isStartGameEnabled = isHost && players.length >= 4;

    return (
        <div className="room-page">
            <h1>Room ID: {roomId}</h1>
            <div className="player-cards">
                {players.length === 0 ? (
                    <p>No players in this room</p>
                ) : (
                    players.map((player, index) => (
                        <div className="player-card" key={index}>
                            <h2>{player.username}</h2>
                        </div>
                    ))
                )}
            </div>
            <button className="refresh-btn" onClick={refreshPlayers}>Refresh</button>
            <div className="button-container">
                <button className="leave-room-btn" onClick={handleLeaveRoom}>Leave Room</button>
                {/*{isStartGameEnabled && (*/}
                    <button
                        className="start-game-btn"
                        onClick={handleStartGame}
                    >
                        Start Game
                    </button>
                {/*)}*/}
            </div>
        </div>
    );
}


export default RoomPage;

//ToDo: When a player closes the tab, the player should be removed from the room
//ToDo: When the host closes the tab, the room should be deleted
//ToDo: When the host starts the game, the game should start for all players in the room