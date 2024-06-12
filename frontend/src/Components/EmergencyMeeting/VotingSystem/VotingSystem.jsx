import { useCallback, useEffect, useState } from "react";
import "./votingSystem.css";
import axios from "axios";
import playerIcon from "./playerIcon.png";
import Chat from "../Chat/Chat";
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
    const [countdown, setCountdown] = useState(60);
    const { emergencyStompClient, isConnected } = useWebSocket();
    const navigate = useNavigate();

    const playerRoleList = sessionStorage.getItem('rolesList');
    const roomId = sessionStorage.getItem('roomId');
    const localUsername = sessionStorage.getItem('username');
    const playerId = sessionStorage.getItem('playerId');
    const playerStatus = sessionStorage.getItem('playerStatus');

    const fetchChatRoomData = useCallback(async () => {
        try {
            console.log('Fetching players which are alive:', roomId);
            const response = await axios.get(`http://localhost:8081/api/gameRooms/getAlivePlayersByRoomId/${roomId}`);
            console.log('Alive players:', response);
            setPlayers(response.data);
        } catch (error) {
            console.error('Error fetching room data:', error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchChatRoomData().then(r => console.log('Fetched chat room data'));
        console.log("This is the player status: ", playerStatus);
        console.log("These are the players which are alive: ", players);

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


            if (result.status === "skipped" || result.status === "tie") {
                setVoteResults({});
                setVotedOut("skip");
                sessionStorage.setItem('playerStatus', playerStatus === 'DEAD' || playerStatus === 'GHOST' ? 'GHOST' : 'ALIVE');
                alert(result.status === "skipped" ? "Voting was skipped, no player was ejected." : "There was a tie, no player was ejected.");
            } else {
                setVoteResults(result.voteCount);
                setVotedOut(result.mostVotedPlayerId);
                sessionStorage.setItem('playerStatus', result.mostVotedPlayerId === playerId ? 'GHOST' : 'ALIVE');
                alert(`Player ${result.mostVotedPlayerUsername} was ejected. He was an ${result.mostVotedPlayerRole}!`);
            }
        } catch (error) {
            console.error('Error fetching vote results:', error);
        }

        if (isConnected) {
            console.log('Websocket for emergency Meeting is connected');
            emergencyStompClient.publish({
                destination: `/app/emergencyMeetingEnd/${roomId}`,
                body: ''
            });
            setTimeout(() => {
                navigate('/game');
            }, 5000);
        } else {
            console.error('Websocket is not connected');
        }
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
        console.log('Skip vote');
        if (userVote === "skip") {
            setUserVote(null);
            setSkipVoteCount(prevCount => prevCount - 1);
            axios.post('http://localhost:8083/api/voting/vote', {
                gameRoom: roomId,
                voterId: playerId,
                voterUsername: localUsername,
                targetPlayerId: null,
                targetPlayerUsername: null,
                targetPlayerRole: null
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
            axios.post('http://localhost:8083/api/voting/vote', {
                gameRoom: roomId,
                voterId: playerId,
                voterUsername: localUsername,
                targetPlayerId: "skip" ,
                targetPlayerUsername: null,
                targetPlayerRole: null
            }).then(response => {
                console.log('Skip vote response:', response);
            }).catch(error => {
                console.error('Error skipping vote:', error);
            });
        }
    };

    const openChat = () => {
        setShowChat(true);
    };

    const closeChat = () => {
        setShowChat(false);
    };

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
                    <button className={`skip-vote-button ${userVote === "skip" ? 'selected' : ''}`}
                            onClick={skipVote}
                            disabled={playerStatus !== 'ALIVE'}
                    >
                    Skip Vote
                    </button>
                </div>
                <div className="countdown-timer">Voting ends in: {countdown}s</div>
            </div>
            {showChat && <Chat
                onClose={closeChat}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                isPlayerAlive={playerStatus === 'ALIVE'}
            />}
        </div>
    );
}

export default VotingSystem;
