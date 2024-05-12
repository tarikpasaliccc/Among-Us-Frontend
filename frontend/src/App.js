import './App.css';
import Home from "./Components/home/Home";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Game from "./Components/game/Game";
import LoadingScreen from "./Components/loadingScreen/loadingScreen";
import RoomList from "./Components/roomsList/RoomsList";
import RoomPage from "./Components/roomPage/RoomPage";

function App() {

    return (
        <Router>
            <div className="App">
                <Routes>
                    <Route path="/" element={<Home/>} />
                    <Route path="/game" element={<Game/>}/>
                    <Route path="/loadingScreen" element={<LoadingScreen/>}/>
                    <Route path="/rooms" element={<RoomList/>}/>
                    <Route path="/room/:roomId" element={<RoomPage/>}/>
                </Routes>
            </div>
        </Router>
    );
}

export default App;
