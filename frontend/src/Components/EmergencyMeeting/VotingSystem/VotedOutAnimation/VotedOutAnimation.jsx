import React, { useEffect, useRef } from 'react';
import './VotedOutAnimation.css';
import ejectedIcon from './ejectedPlayer.png';
import backgroundVideo from "./space-background.mp4"
import {useLocation, useNavigation} from "react-router-dom";


const VotedOutAnimation = () => {
    const videoRef = useRef(null);
    const location = useLocation();
    const player = location.state.player;

    useEffect(() => {
        console.log('Voted out animation mounted');
        const timer = setTimeout(() => {
        }, 10000);

        // Play the video
        if (videoRef.current) {
            videoRef.current.play();
        }

        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="voted-out-animation">
            <video ref={videoRef} className="background-video" autoPlay muted loop >
                <source src={backgroundVideo} type="video/mp4" />
            </video>
            <div className="animation-content">
                <div className="ejected-message">
                    {player} was ejected
                </div>
            </div>
        </div>
    );
};

export default VotedOutAnimation;