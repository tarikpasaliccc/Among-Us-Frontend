import {useLocation, useNavigate} from 'react-router-dom';
import './LoadingScreen.css';
import {useEffect, useRef} from "react";
import SockJS from "sockjs-client";
import Stomp from 'webstomp-client';


function LoadingScreen() {
    const stompClientRef = useRef(null);
    const sessionId = sessionStorage.getItem('sessionId');
    const token = sessionStorage.getItem('jwtToken');
    const roomId = sessionStorage.getItem('roomId');
    const playerId = sessionStorage.getItem('playerId');
    const location = useLocation();
    const navigate = useNavigate();
    const username = sessionStorage.getItem('username');

    useEffect(() => {
        console.log('Connecting to websocket with username:', username);
        const socket = new SockJS('http://localhost:8081/ws/gameRoom');
        stompClientRef.current = Stomp.over(socket);

        stompClientRef.current.connect({}, () => {
            stompClientRef.current.subscribe(`/topic/startGame/${roomId}`, (message) => {
                const gameInfo = JSON.parse(message.body);
                if (gameInfo.roomId === roomId && gameInfo.started) {
                    console.log('Game started');
                }
            });

            stompClientRef.current.send('/app/startGame', JSON.stringify({
                roomId: roomId,
                playerId: playerId,
                username: username
            }), {});
        });

        const timeout = setTimeout(() => {
            navigate("/game");
        }, 5000);

        return () => {
            if (stompClientRef.current && stompClientRef.current.connected) {
                stompClientRef.current.disconnect();
            }
            clearTimeout(timeout);
        };
    }, [navigate, roomId, sessionId, token]);



    return (
        <div className="among-us-loading-screen">
            <div className="loading-text"></div>
            <div className="runner"></div>
        </div>
    );
}


export default LoadingScreen;
