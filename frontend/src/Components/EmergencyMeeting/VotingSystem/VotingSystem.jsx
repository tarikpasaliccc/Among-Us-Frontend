import { useCallback, useEffect, useState } from "react";
import "./votingSystem.css";
import axios from "axios";
import playerIcon from "./playerIcon.png";
import Chat from "../Chat/Chat";
import VotedOutAnimation from "./VotedOutAnimation/VotedOutAnimation";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../../../Context/WebSocketContext";

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
    const { emergencyStompClient, isConnected } = useWebSocket();
    const navigate = useNavigate();

    const playerRoleList = sessionStorage.getItem('rolesList');
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
                alert("Voting was skipped, no player was ejected.");
            } else if (result.status === "tie") {
                setVoteResults({});
                setVotedOut(null);
                alert("There was a tie, no player was ejected.");
            } else {
                setVoteResults(result.voteCount);
                setVotedOut(result.mostVotedPlayerId);

                // Send the result to the backend to set the player to dead
                try {
                    const eliminateResponse = await axios.post('http://localhost:8081/api/gameRooms/eliminatePlayer', {
                        gameRoomId: roomId,
                        votedPlayerId: result.mostVotedPlayerId
                    });
                    console.log('Player set to dead: ', eliminateResponse.data);
                } catch (error) {
                    console.error('Error setting player to dead:', error);
                }

                alert(`Player ${result.mostVotedPlayerUsername} was ejected. He was an ${result.mostVotedPlayerRole}!`);
            }

            // Send emergency meeting end signal
            if (isConnected) {
                emergencyStompClient.send(`/app/emergencyMeetingEnd/${roomId}`, {}, () => {
                    console.log('Emergency meeting is being ended');
                    navigate('/game');
                });
            } else {
                navigate('/game');
            }
        } catch (error) {
            console.error('Error concluding vote:', error);
        }
        navigate('/game');
    };

    const votePlayer = (targetPlayerId, targetPlayerUsername) => {
        const playerRoles = JSON.parse(playerRoleList);
        let targetPlayerRole = null;
        for (let i = 0; i < playerRoles.length; i++) {
            if (playerRoles[i].playerId == targetPlayerId) {
                targetPlayerRole = playerRoles[i].role;
                break;
            }
        }

        console.log('Voting for player:', targetPlayerId, targetPlayerUsername, targetPlayerRole);

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
                    targetPlayerUsername: targetPlayerUsername,
                    targetPlayerRole: targetPlayerRole
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
                    targetPlayerUsername: targetPlayerUsername,
                    targetPlayerRole: targetPlayerRole
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
