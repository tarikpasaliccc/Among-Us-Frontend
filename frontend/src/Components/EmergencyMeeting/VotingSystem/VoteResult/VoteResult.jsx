import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './voteResult.css';

const VoteResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { result } = location.state || { result: { playerName: '', wasImpostor: false } };

    // Log the received state
    console.log('Received result state:', result);

    const [displayedText, setDisplayedText] = useState('');
    const fullText = result.wasImpostor
        ? `${result.playerName} was the Impostor`
        : `${result.playerName} was NOT the Impostor`;

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
        }, 50); // Adjust this value to make the typing speed faster

        const timeout = setTimeout(() => {
            navigate('/game');
        }, 6000);

        return () => {
            clearInterval(typingInterval);
            clearTimeout(timeout);
        };
    }, [fullText, navigate]);

    const renderText = (text) => {
        const parts = text.split('NOT');
        return (
            <>
                {parts[0]}
                <span className="red-text">NOT</span>
                {parts[1]}
            </>
        );
    };

    return (
        <div className="result-overlay">
            <video autoPlay loop muted className="background-video">
                <source src="/space-background.mp4" type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <div className="result-box">
                <h1 className="result-text">
                    {result.wasImpostor ? displayedText : renderText(displayedText)}
                </h1>
            </div>
        </div>
    );
};

export default VoteResult;
