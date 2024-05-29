import { useCallback, useEffect, useState } from "react";
import "./votingSystem.css";
import axios from "axios";
import playerIcon from "./playerIcon.png";
import Chat from "../Chat/Chat";
import VotedOutAnimation from "./VotedOutAnimation/VotedOutAnimation";
import {useNavigate} from "react-router-dom";

const VotingSystem = () => {
    const [players, setPlayers] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [votes, setVotes] = useState({});
    const [userVote, setUserVote] = useState(null);
    const [votedOut, setVotedOut] = useState(null);
    const [skipVoteCount, setSkipVoteCount] = useState(0);
    const [voteResults, setVoteResults] = useState({});
    const [countdown, setCountdown] = useState(10);
    const [newMessageNotification, setNewMessageNotification] = useState(false);

    const navigate = useNavigate();

    const roomId = sessionStorage.getItem('roomId');
    const localUsername = sessionStorage.getItem('username');
    const playerId = sessionStorage.getItem('playerId');


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

    useEffect(() => {
        fetchChatRoomData().then(r => console.log('Fetched chat room data'));

        const timer = setInterval(() => {
            setCountdown(prevCountdown => {
                if (prevCountdown <= 1) {
                    clearInterval(timer);
                    handleVotingEnd().then(r => console.log('Voting ended'));
                    return 0;
                }
                return prevCountdown - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [fetchChatRoomData]);


    const handleVotingEnd = async () => {
        console.log('Voting ended.');
        try {
            const response = await axios.get(`http://localhost:8083/api/voting/results/${roomId}`);
            const result = response.data;
            console.log('Vote result:', result);
            if (result.status === "skipped") {
                setVoteResults({});
                setVotedOut(null);
                //ToDO: Display a message to all players that the vote was skipped
                alert("Voting was skipped, no player was ejected.");
            } else {
                setVoteResults(result.voteCount);
                setVotedOut(result.mostVotedPlayerId);
                // Send the result to the backend to set the player to dead
                try {
                    const response = await axios.post('http://localhost:8081/api/gameRooms/voteResult', {
                        gameRoomId: roomId,
                        votedPlayerId: result.mostVotedPlayerId
                    })
                    console.log('Player set to dead: ', response.data);
                } catch (error) {
                    console.error('Error setting player to dead:', error);
                }

                alert("Player " + result.mostVotedPlayerUsername + " was ejected.");
                //navigate('/votedOut', {state: {player: result.mostVotedPlayer}});
            }
        } catch (error) {
            console.error('Error concluding vote:', error);
        }
    };

    const votePlayer = (targetPlayerId, targetPlayerUsername) => {
        setVotes((prevVotes) => {
            const newVotes = { ...prevVotes };

            if (userVote === "skip") {
                setSkipVoteCount(prevCount => prevCount - 1); // Decrement skip vote count
            } else if (userVote && userVote !== targetPlayerId) {
                newVotes[userVote] -= 1;
            }

            if (userVote === targetPlayerId) {
                newVotes[targetPlayerId] -= 1;
                setUserVote(null);
                // Send a request to remove the vote
                axios.post('http://localhost:8083/api/voting/vote', {
                    gameRoom: roomId,
                    voterId: playerId,
                    voterUsername: localUsername,
                    targetPlayerId: null,
                    targetPlayerUsername: targetPlayerUsername
                }).then(response => {
                    console.log('Vote removal response:', response);
                }).catch(error => {
                    console.error('Error removing vote:', error);
                });
            } else {
                newVotes[targetPlayerId] = (newVotes[targetPlayerId] || 0) + 1;
                setUserVote(targetPlayerId);
                // Send a request to cast the vote
                axios.post('http://localhost:8083/api/voting/vote', {
                    gameRoom: roomId,
                    voterId: playerId,
                    voterUsername: localUsername,
                    targetPlayerId: targetPlayerId,
                    targetPlayerUsername: targetPlayerUsername
                }).then(response => {
                    console.log('Vote response:', response);
                }).catch(error => {
                    console.error('Error casting vote:', error);
                });
            }
            return newVotes;
        });
    };

    const skipVote = () => {
        if (userVote === "skip") {
            // Send a request to remove the skip vote
            setUserVote(null);
            setSkipVoteCount(prevCount => prevCount - 1);
            axios.post('http://localhost:8083/api/voting/vote', {
                gameRoom: roomId,
                voterId: playerId,
                voterUsername: localUsername,
                targetPlayerId: null,
                targetPlayerUsername: null
            }).then(response => {
                console.log('Skip vote removal response:', response);
            }).catch(error => {
                console.error('Error removing skip vote:', error);
            });
        } else {
            if (userVote) {
                setVotes((prevVotes) => {
                    const newVotes = { ...prevVotes };
                    newVotes[userVote] -= 1;
                    return newVotes;
                });
            }
            setUserVote("skip");
            setSkipVoteCount(prevCount => prevCount + 1); // Increment skip vote count
            // Send a request to cast the skip vote
            axios.post('http://localhost:8083/api/voting/vote', {
                gameRoom: roomId,
                voterId: playerId,
                voterUsername: localUsername,
                targetPlayerId: "skip" ,
                targetPlayerUsername: null
            }).then(response => {
                console.log('Skip vote response:', response);
            }).catch(error => {
                console.error('Error skipping vote:', error);
            });
        }
    };

    const openChat = () => {
        setShowChat(true);
        setNewMessageNotification(false);
    };

    const closeChat = () => {
        setShowChat(false);
    };

    const handleNewMessage = useCallback((sender) => {
        console.log('New message from ' + sender);
        console.log('Current localUsername:', localUsername);
        if (sender !== localUsername) {
            console.log('New message from ' + sender);
            setNewMessageNotification(true);
        }
    }, [localUsername]);

    return (
        <div className="voting-overlay">
            <div className="voting-box">
                <h2 className="voting-header">Who is the impostor?</h2>
                <button className="chat-voting-button" onClick={openChat}></button>
                <div className="voting-container">
                    {players.map((player, index) => (
                        <div key={index} className={`voting-player-card ${userVote === player.playerId ? 'selected' : ''}`} onClick={() => votePlayer(player.playerId, player.username)}>
                            <div className="voting-player-name">{player.username}</div>
                            {voteResults && (
                                <div className="vote-dots">
                                    {[...Array(voteResults[player.playerId] || 0)].map((e, i) => (
                                        <img key={i} src={playerIcon} alt="player icon" className="player-icon"/>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                <div className="skip-vote-container">
                    <button className="skip-vote-button" onClick={skipVote}>Skip Vote</button>
                </div>
                <div className="countdown-timer">Voting ends in: {countdown}s</div>
            </div>
            {showChat && <Chat
                onClose={closeChat}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
            />}
        </div>
    );
}

export default VotingSystem;

//ToDo: Frontend: Display the user with a ejected message after the vote end
//ToDO: Frontend: After the vote end it should check if the player with the most votes is an impostor or not and display the result to all players


//ToDo: Backend: Check what role the player has and send it to the frontend
//ToDo: Backend: Check if the player with the most votes is an impostor or not and send the result to the frontend
//ToDo: Backend: Set the player with the most votes to dead