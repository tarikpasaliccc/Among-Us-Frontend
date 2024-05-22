import React, {useCallback, useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import axios from "axios";
import './roomPage.css';
import crewImage from './crew.png';
import reloadImage from './reload-btn.png';
import exitImage from './exit-btn.png';

function RoomPage() {
    const { roomId } = useParams();
    const [players, setPlayers] = useState([]);
    const navigate = useNavigate();
    const token = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const location = useLocation();
    const username = sessionStorage.getItem('username');
    const [hostSessionsId, setHostSessionsId] = useState(null);

    const fetchRoomData = useCallback(async () => {
        try {
            console.log('Fetching room data for room:', roomId)
            const response = await axios.get(`http://localhost:8081/api/gameRooms/getGameRoom/${roomId}`);
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
                await axios.post('http://localhost:8081/api/gameRooms/leaveGameRoom', {
                    roomId: roomId,
                    playerId: playerId,
                    username: username,
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
            <div className="top-bar">
                <h1 className="roomID">ROOM ID: {roomId}</h1>
                <img src={crewImage} alt="Crew" className="crewImg" />
                <img src={reloadImage} alt="Reload" className="refresh-btn" onClick={refreshPlayers} />
            </div>
            <img src={exitImage} alt="Exit" className="exit-btn" onClick={handleLeaveRoom} />
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
                    disabled={!isStartGameEnabled}
                >
                    Start
                </button>
            </div>
        </div>
    );

}

export default RoomPage;


//ToDo: When a player closes the tab, the player should be removed from the room
//ToDo: When the host closes the tab, the room should be deleted
//ToDo: When the host starts the game, the game should start for all players in the room