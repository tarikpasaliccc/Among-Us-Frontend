import { useNavigate } from 'react-router-dom';
import './LoadingScreen.css';
import {useEffect} from 'react';

function LoadingScreen() {
    const navigate = useNavigate();

    useEffect(() => {
        const timeout = setTimeout(() => {
            navigate('/game');
        }, 5000);


        return () => {
            clearTimeout(timeout);
        };
    }, [navigate]);

    return (
        <div className="among-us-loading-screen">
            <div className="loading-text"></div>
            <div className="runner"></div>
        </div>
    );
}

export default LoadingScreen;
