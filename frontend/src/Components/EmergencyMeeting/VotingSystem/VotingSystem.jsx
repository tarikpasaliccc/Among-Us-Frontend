import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './votingSystem.css';
import playerIcon from './playerIcon.png';
import Chat from '../Chat/Chat';
import { useWebSocket } from '../../../Context/WebSocketContext';

const VotingSystem = () => {
    const [players, setPlayers] = useState([]);
    const [showChat, setShowChat] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [votes, setVotes] = useState({});
    const [userVote, setUserVote] = useState(null);
    const [skipVoteCount, setSkipVoteCount] = useState(0);
    const [voteResults, setVoteResults] = useState({});
    const [countdown, setCountdown] = useState(3); // Shorter countdown duration
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
            console.log('Alive players:', response.data);
            setPlayers(response.data);
        } catch (error) {
            console.error('Error fetching room data:', error);
        }
    }, [roomId]);

    useEffect(() => {
        fetchChatRoomData().then(() => console.log('Fetched chat room data'));

        const timer = setInterval(() => {
            setCountdown(prevCountdown => {
                if (prevCountdown <= 1) {
                    clearInterval(timer);
                    console.log('Countdown finished, navigating to VoteResult');
                    handleVotingEnd()
                        .then(() => {
                            console.log('Finished handling voting end.');
                        })
                        .catch(error => {
                            console.error('Error in handleVotingEnd:', error);
                        });
                    return 0;
                }
                return prevCountdown - 1;
            });
        }, 1000); // 1000 ms = 1 second

        return () => clearInterval(timer);
    }, [fetchChatRoomData]);

    const handleVotingEnd = async () => {
        console.log('Voting ended.');

        try {
            const response = await axios.get(`http://localhost:8083/api/voting/results/${roomId}`);
            const result = response.data;
            console.log('Vote result:', result);

            let wasImpostor = false;
            if (result.status !== "skipped" && result.status !== "tie") {
                wasImpostor = result.mostVotedPlayerRole === 'Impostor';
            }

            const playerName = result.mostVotedPlayerUsername || 'No one';
            console.log('Navigating to /voteResult with state:', { playerName, wasImpostor });
            navigate('/voteResult', { state: { result: { playerName, wasImpostor } } });

        } catch (error) {
            console.error('Error fetching vote results:', error);
        }

        if (isConnected) {
            console.log('Websocket for emergency Meeting is connected');
            emergencyStompClient.publish({
                destination: `/app/emergencyMeetingEnd/${roomId}`,
                body: ''
            });
        } else {
            console.error('Websocket is not connected');
        }
    };

    const votePlayer = (targetPlayerId, targetPlayerUsername) => {
        const playerRoles = JSON.parse(playerRoleList);
        let targetPlayerRole = null;
        for (let i = 0; i < playerRoles.length; i++) {
            if (playerRoles[i].playerId === targetPlayerId) {
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
                    console.log('Vote removal response:', response.data);
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
                    console.log('Vote response:', response.data);
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
                console.log('Skip vote removal response:', response.data);
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
                targetPlayerId: "skip",
                targetPlayerUsername: null,
                targetPlayerRole: null
            }).then(response => {
                console.log('Skip vote response:', response.data);
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
};

export default VotingSystem;
