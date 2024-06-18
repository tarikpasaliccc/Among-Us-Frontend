import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from "axios";
import {useNavigate} from "react-router-dom";
import "./rooms.css"
import reloadImage from "../roomPage/reload-btn.png";
import homeicon from "./home-icon.png";

function RoomList() {
    const [rooms, setRooms] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const navigate = useNavigate();
    const token = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const username = sessionStorage.getItem('username');

    const videoRef = useRef(null);

    const fetchRooms = useCallback(async () => {
        try {
            const response = await axios.get('http://localhost:8081/api/gameRooms/getGameRooms');
            console.log('Rooms Response:', response.data);
            const roomsData = response.data;
            if (Array.isArray(roomsData)) {
                setRooms(roomsData);
            } else {
                console.error('Expected an array, received:', roomsData);
                setRooms([]);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
            setRooms([]);
        }
    }, []);

    useEffect(() => {
        fetchRooms().then(r => console.log('Fetched rooms'));

        // Ensure video playback
        const video = videoRef.current;
        if (video) {
            video.play().catch(error => {
                console.error('Error attempting to play video:', error);
            });
        }
    }, [fetchRooms]);

    const handleJoinRoom = async (e, roomId, started) => {
        e.preventDefault();

        if (started) {
            alert('Game has already started');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8081/api/gameRooms/joinGameRoom', {
                roomId: roomId,
                playerId: playerId,
                username: username,
            });

            console.log('Joined room successfully:', response.data);
            alert('Joined room successfully');
            navigate(`/room/${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Error joining room');
        }
    };

    const refreshRooms = () => {
        fetchRooms().then(r => console.log('Fetched rooms'));
    };

    const handleCreateRoom = async () => {
        if (!newRoomName) {
            alert('Please enter a room name');
            return;
        }

        try {
            const response = await axios.post('http://localhost:8081/api/gameRooms/createGameRoom', {
                token: token,
                sessionId: sessionId,
                roomName: newRoomName
            });
            console.log('Game room created:', response.data);
            setIsModalOpen(false);
            setNewRoomName('');
            refreshRooms();
        } catch (error) {
            console.error('Error creating game room:', error);
            alert('Error creating game room');
        }
    };

    const handleDeleteRoom = async (e, roomId) => {
        e.preventDefault();

        const confirm = window.confirm('Are you sure you want to delete this room?');
        if (!confirm) {
            return;
        }

        try {
            const response = await axios.delete('http://localhost:8081/api/gameRooms/deleteGameRoom', {
                params: {
                    roomId: roomId,
                    sessionId: sessionId,
                    username: username
                }
            });
            console.log('Room deleted:', response);
            refreshRooms();
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('Error deleting room');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCreateRoom();
        }
    };

    return (
        <div className="full-page-wrapper">
            <video ref={videoRef} autoPlay loop muted playsInline className="video-background">
                <source src="/list-background.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="main-wrapper">
                <a href="/" className="home-button">
                    <img src={homeicon} alt="Home" style={{width: '60px', height: '60px'}}/>
                </a>
                <h1 className="joinRoom">ACTIVE ROOMS</h1>
                <img src={reloadImage} alt="Reload" className="refresh-btn2" onClick={refreshRooms}/>
                {!Array.isArray(rooms) || rooms.length === 0 ? (
                    <p>No active rooms, create one yourself!</p>
                ) : (
                    <ul className="room-list">
                        {rooms.map((room) => (
                            <li key={room.id} className="room-item">
                                <span>{room.name}</span>
                                <button className="join-btn" onClick={(e) => handleJoinRoom(e, room.id,room.started)}>join</button>
                                {room.createdBy === sessionId && (
                                    <button className="delete-btn" id="delete-btn"
                                            onClick={(e) => handleDeleteRoom(e, room.id)}>delete</button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                <div className="main-container">
                    <div className="button-container">
                        <button onClick={() => setIsModalOpen(true)}>create room</button>
                    </div>

                    {isModalOpen && (
                        <div className="modal">
                            <h2>create new room</h2>
                            <input
                                type="text"
                                placeholder="enter room name"
                                value={newRoomName}
                                onChange={(e) => setNewRoomName(e.target.value)}
                                onKeyDown={handleKeyPress}
                            />
                            <button onClick={handleCreateRoom} className="createRoom-btn">create</button>
                            <button onClick={() => setIsModalOpen(false)} className="cancel-btn">cancel</button>
                        </div>
                    )}

                    {isModalOpen && <div className="overlay" onClick={() => setIsModalOpen(false)}></div>}
                </div>
            </div>
        </div>
    );
}

export default RoomList;
