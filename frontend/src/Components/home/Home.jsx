import React, {useState} from 'react';
import logo from './logo.png';
import icon from './homeicon.png';
import './home.css';
import backgroundImage from './homebackground2.jpg'
import {useNavigate} from "react-router-dom";
import axios from "axios";

const Home = () => {
    const [name, setName] = useState('');
    const navigate = useNavigate();

    const handleInputChange = (e) => {
        setName(e.target.value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const response = await axios.post('http://localhost:8084/api/player/save', {
                username: name}
            )
            console.log('Joined successfully: ', response.data);
            alert('Joined successfully')
            sessionStorage.setItem('jwtToken', response.data.token);
            sessionStorage.setItem('sessionId', response.data.sessionId);
            sessionStorage.setItem('playerId', response.data.playerId);
            sessionStorage.setItem('username', name);
            navigate("/rooms", { state: { username: name } });
        } catch (error) {
            if (error.response) {
                if (error.response.status === 403) {
                    console.log('403 error:', error.response.data);
                    alert('This username is already taken. Please choose another one.');
                } else if (error.response.data) {
                    console.log('Error submitting name:', error.response.data);
                    alert('This username is already taken. Please choose another one.');
                }
            }
        }
    }

    return (
        <div className="home-container" style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            height: '100vh',
            overflow: 'hidden'
        }}>
            <a href="/" className="home-button">
                <img src={icon} alt="Home" style={{width: '43px', height: '40px'}}/>
            </a>

            <div className="content">
                <img src={logo} className="logo mb-4" alt="Logo"/>
                <div className="menu">
                    <a href="/">profile</a>
                    <a href="/">how to</a>
                    <a href="/">about</a>
                </div>
                <form className="input-group" onSubmit={handleSubmit}>
                    <input
                        type="text"
                        className="home-form-control"
                        placeholder="Enter Name"
                        maxLength={10}
                        required={true}
                        value={name}
                        onChange={handleInputChange}
                    />
                    <button className="btn btn-danger">play</button>
                </form>
            </div>
        </div>
    );
    };

export default Home;