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
    const navigate = useNavigate();
    const location = useLocation();
    const username = location.state?.username;

    useEffect(() => {
        const socket = new SockJS('http://localhost:8080/ws');
        stompClientRef.current = Stomp.over(socket);

        stompClientRef.current.connect({}, () => {
            stompClientRef.current.subscribe(`/topic/startGame/${roomId}`, (message) => {
                const gameInfo = JSON.parse(message.body);
                if (gameInfo.roomId === roomId && gameInfo.started) {
                    console.log('Game started');
                }
            });

            setTimeout(() => {
                stompClientRef.current.send('/app/startGame', JSON.stringify({
                    token: token,
                    sessionId: sessionId,
                    roomId: roomId
                }), {});
            }, 500);
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
    }, [navigate, roomId, sessionId, token, username]);

    return (
        <div className="among-us-loading-screen">
            <div className="loading-text"></div>
            <div className="runner"></div>
        </div>
    );
}

export default LoadingScreen;
