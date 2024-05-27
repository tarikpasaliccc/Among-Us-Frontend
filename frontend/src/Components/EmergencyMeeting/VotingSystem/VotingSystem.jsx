import { useCallback, useEffect, useState } from "react";
import "./votingSystem.css";
import axios from "axios";
import Chat from "../Chat/Chat";

const VotingSystem = () => {
    const [players, setPlayers] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [votes, setVotes] = useState({});
    const [newMessageNotification, setNewMessageNotification] = useState(false);
    const roomId = sessionStorage.getItem('roomId');
    const username = sessionStorage.getItem('username');


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
        setNewMessageNotification(false);
    }

    function closeChat() {
        setShowChat(false);
    }

    const handleNewMessage = useCallback((sender) => {
        console.log('New message from ' + sender);
        console.log('Current username:', username);
        if (sender !== username) {
            console.log('New message from ' + sender);
            setNewMessageNotification(true);
        }
    }, [username]);


    useEffect(() => {
        fetchChatRoomData().then(r => console.log('Fetched chat room data'));
    }, [fetchChatRoomData] );





    return (
        <div className="voting-overlay">
            <div className="voting-box">
                <h2 className="voting-header">Who is the impostor?</h2>
                <button className="chat-voting-button" onClick={openChat}></button>
                {/*{newMessageNotification && <span className="new-message-indicator">!</span>}*/}
                <div className="voting-container">
                    {players.map((player, index) => (
                        <div key={index} className="player-card" onClick={() => votePlayer(player.playerId)}>
                            <div className="player-name">{player.username}</div>
                            <div className="vote-count">Votes: {votes[player.playerId] || 0}</div>
                        </div>
                    ))}
                </div>
            </div>
            {showChat && <Chat
                onClose={closeChat}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                //onNewMessage={handleNewMessage}
            />}
        </div>
    );
}

export default VotingSystem;
