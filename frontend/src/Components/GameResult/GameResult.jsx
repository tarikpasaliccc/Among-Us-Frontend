import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './gameResult.css';

const GameResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { result } = location.state || { result: { winner: '' } };

    const [displayedText, setDisplayedText] = useState('');
    const fullText = result.winner === 'Impostor'
        ? 'IMPOSTORS WON'
        : 'CREWMATES WON';

    useEffect(() => {
        const typingInterval = setInterval(() => {
            setDisplayedText(prev => {
                if (prev.length < fullText.length) {
                    return fullText.slice(0, prev.length + 1);
                } else {
                    clearInterval(typingInterval);
                    return prev;
                }
            });
        }, 50);

        const timeout = setTimeout(() => {
            navigate('/rooms');
        }, 8000);

        return () => {
            clearInterval(typingInterval);
            clearTimeout(timeout);
        };
    }, [fullText, navigate]);

    const resultClass = result.winner === 'Impostor' ? 'result-text impostor' : 'result-text crewmate';

    return (
        <div className="result-overlay">
            <video autoPlay loop muted className="background-video">
                <source src="/space-background.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="result-box">
                <h1 className={resultClass}>
                    {displayedText}
                </h1>
            </div>
        </div>
    );
};

export default GameResult;
