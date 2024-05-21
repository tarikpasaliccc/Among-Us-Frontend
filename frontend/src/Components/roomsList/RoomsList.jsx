import React, {useCallback, useEffect, useState} from 'react';
import axios from "axios";
import {useLocation, useNavigate} from "react-router-dom";
import "./rooms.css"

function RoomList() {
    const [rooms, setRooms] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const navigate = useNavigate();
    const token = sessionStorage.getItem('jwtToken');
    const sessionId = sessionStorage.getItem('sessionId');
    const playerId = sessionStorage.getItem('playerId');
    const username = sessionStorage.getItem('username');


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
        fetchRooms();
    }, [fetchRooms]);

    const handleJoinRoom = async (e, roomId) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:8081/api/gameRooms/joinGameRoom', {
                roomId: roomId,
                playerId: playerId,
                username: username,
            });

            console.log('Joined room successfully:', response.data);
            alert('Joined room successfully');
            navigate(`/room/${roomId}`, { state: { username: username } }   );
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Error joining room');
        }
    };


    const refreshRooms = () => {
        fetchRooms();
    };

    const handleCreateRoom = async () => {
        if (!newRoomName) {
            alert('Please enter a room name');
            return;
        }

        try {
            const response = await axios.post(`http://localhost:8081/api/gameRooms/createGameRoom`, {
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
            const response = await axios.delete(`http://localhost:8081/api/gameRooms/deleteGameRoom`, {
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

    }

    return (
        <div className="main-wrapper">
            <h1>Join a Room</h1>
            {!Array.isArray(rooms) || rooms.length === 0 ? (
                <p>No rooms available, please create a room</p>
            ) : (
                <ul className="room-list">
                    {rooms.map((room) => (
                        <li key={room.id} className="room-item">
                            <span>{room.name}</span>
                            <button className="rooms-btn" onClick={(e) => handleJoinRoom(e, room.id)}>Join</button>
                            {room.createdBy === sessionId && (
                                <button className="rooms-btn" id="delete-btn" onClick={(e) => handleDeleteRoom(e, room.id)}>Delete</button>
                            )}
                        </li>
                    ))}
                </ul>
            )}
            <div className="main-container">
                <div className="button-container">
                    <button onClick={refreshRooms}>Refresh</button>
                    <button onClick={() => setIsModalOpen(true)}>Create Room</button>
                </div>

                {isModalOpen && (
                    <div className="modal">
                        <h2>Create a New Room</h2>
                        <input
                            type="text"
                            placeholder="Enter room name"
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                        />
                        <button onClick={handleCreateRoom}>Create</button>
                        <button onClick={() => setIsModalOpen(false)}>Cancel</button>
                    </div>
                )}

                {isModalOpen && <div className="overlay" onClick={() => setIsModalOpen(false)}></div>}
            </div>
        </div>
    );

}



export default RoomList;
