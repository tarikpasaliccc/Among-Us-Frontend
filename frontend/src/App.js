import './App.css';
import Home from "./Components/home/Home";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Game from "./Components/game/Game";
import LoadingScreen from "./Components/loadingScreen/loadingScreen";
import RoomList from "./Components/roomsList/RoomsList";
import RoomPage from "./Components/roomPage/RoomPage";
import Chat from "./Components/chat/Chat";
import {WebSocketProvider} from "./Context/WebSocketContext";

function App() {

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
                        <Route path="/chat" element={<Chat/>}/>
                    </Routes>
                </div>
            </Router>
        </WebSocketProvider>

    );
}

export default App;
