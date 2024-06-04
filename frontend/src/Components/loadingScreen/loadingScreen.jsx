import { useNavigate } from 'react-router-dom';
import './LoadingScreen.css';
import { useEffect, useRef } from 'react';
import { useWebSocket } from '../../Context/WebSocketContext';

function LoadingScreen() {
    const { gameRoomStompClient, isGameRoomConnected } = useWebSocket();
    const sessionId = sessionStorage.getItem('sessionId');
    const token = sessionStorage.getItem('jwtToken');
    const roomId = sessionStorage.getItem('roomId');
    const playerId = sessionStorage.getItem('playerId');
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');

    useEffect(() => {
        let subscription;
        console.log('Starting game for room:', roomId);
        console.log('Player ID:', playerId);
        console.log('Username:', username);

        if (isGameRoomConnected) {
            subscription = gameRoomStompClient.subscribe(`/topic/startGame/${roomId}`, (message) => {
                const gameInfo = JSON.parse(message.body);
                console.log('Game info:', gameInfo);
                if (gameInfo.id === roomId && gameInfo.started) {
                    console.log('Game started');
                    //navigate('/game');
                }
            });

            gameRoomStompClient.send('/app/startGame',{}, JSON.stringify({
                roomId: roomId,
                playerId: playerId,
                username: username
            }));

            gameRoomStompClient.send('/app/join', {}, JSON.stringify({
                roomId: roomId,
                playerId: playerId,
                username: username
            }));
        }

        const timeout = setTimeout(() => {
            navigate('/game');
        }, 5000);

        return () => {
            if (subscription) {
                subscription.unsubscribe();
            }
            clearTimeout(timeout);
        };
    }, [isGameRoomConnected, gameRoomStompClient, navigate, roomId, playerId, username]);

    return (
        <div className="among-us-loading-screen">
            <div className="loading-text"></div>
            <div className="runner"></div>
        </div>
    );
}

export default LoadingScreen;
