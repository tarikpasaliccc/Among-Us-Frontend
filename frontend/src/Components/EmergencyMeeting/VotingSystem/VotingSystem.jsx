import { useCallback, useEffect, useState } from "react";
import "./votingSystem.css";
import axios from "axios";
import Chat from "../Chat/Chat";

const VotingSystem = () => {
    const [players, setPlayers] = useState([]);
    const [showChat, setShowChat] = useState(false); // State to manage chat popup visibility
    const roomId = sessionStorage.getItem('roomId');

    useEffect(() => {
        fetchChatRoomData().then(r => console.log('Fetched chat room data'));
    }, []);

    const fetchChatRoomData = useCallback(async () => {
        try {
            console.log('Fetching chat data for room:', roomId);
            const response = await axios.get(`http://localhost:8081/api/gameRooms/getGameRoom/${roomId}`);
            console.log('Room data:', response);
            setPlayers(response.data.players);
        } catch (error) {
            console.error('Error fetching room data:', error);
        }
    }, [roomId]);

    function votePlayer(playerId) {
        console.log('Voted for player:', playerId);
    }

    function openChat() {
        setShowChat(true);
    }

    function closeChat() {
        setShowChat(false);
    }

    return (
        <div className="voting-overlay">
            <div className="voting-box">
                <h2 className="voting-header">Who is the impostor?</h2>
                <button className="chat-voting-button" onClick={openChat}></button>
                <div className="voting-container">
                    {players.map((player, index) => (
                        <div key={index} className="player-card" onClick={() => votePlayer(player.playerId)}>
                            <div className="player-name">{player.username}</div>
                        </div>
                    ))}
                </div>
            </div>
            {showChat && <Chat onClose={closeChat} />} {/* Conditionally render Chat */}
        </div>
    );
}

export default VotingSystem;
