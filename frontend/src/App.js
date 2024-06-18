import './App.css';
import Home from "./Components/home/Home";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Game from "./Components/game/Game";
import LoadingScreen from "./Components/loadingScreen/loadingScreen";
import RoomList from "./Components/roomsList/RoomsList";
import RoomPage from "./Components/roomPage/RoomPage";
import {WebSocketProvider} from "./Context/WebSocketContext";
import VotingSystem from "./Components/EmergencyMeeting/VotingSystem/VotingSystem";
import VoteResult from './Components/EmergencyMeeting/VotingSystem/VoteResult/VoteResult';
import GameResult from './Components/GameResult/GameResult'; // Import GameResult



const App = () => {

    return (
        <WebSocketProvider>
            <Router>
                <div className="App">
                    <Routes>
                        <Route path="/" element={<Home/>} />
                        <Route path="/game" element={<Game/>}/>
                        <Route path="/loadingScreen" element={<LoadingScreen/>}/>
                        <Route path="/rooms" element={<RoomList/>}/>
                        <Route path="/room/:roomId" element={<RoomPage/>}/>
                        <Route path="/emergencyMeeting" element={<VotingSystem/>}/>
                        <Route path="/voteResult" element={<VoteResult />} />
                        <Route path="/gameResult" element={<GameResult />} />
                    </Routes>
                </div>
            </Router>
        </WebSocketProvider>

    );
}

export default App;

