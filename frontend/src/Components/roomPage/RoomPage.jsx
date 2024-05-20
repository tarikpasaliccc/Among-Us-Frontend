import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import axios from "axios";
import './roomPage.css';


function RoomPage() {
    const {roomId} = useParams();
    const [players, setPlayers] = useState([]);
    const navigate = useNavigate();
    const token = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const [hostSessionsId, setHostSessionsId] = useState(null);
    const location = useLocation();
    const username = location.state?.username;


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
        fetchRoomData().then(r =>   console.log('Fetched room data'));
    }, [fetchRoomData]);

    const refreshPlayers = () =>{
        fetchRoomData().then(r => console.log('Refreshed players'));
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

    const handleStartGame = async () => {


        sessionStorage.setItem('roomId', roomId);
        await axios.post('http://localhost:8080/api/player/assignRoles', {
            token: token,
            sessionId: sessionId,
            roomId: roomId
        }).then(response => {
            console.log('Roles assigned:', response.data);
            navigate(`/loadingScreen/`, { state: { username: username, players: response.data.players } });
        }).catch(error => {
            console.error('Error assigning roles:', error);
            alert('Error assigning roles');
        });
    };


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
