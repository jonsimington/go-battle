import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';

import { Outlet, BrowserRouter, Routes, Route } from 'react-router-dom';
import CreateClient from './components/Clients/CreateClient/CreateClient'
import CreatePlayer from './components/Players/CreatePlayer/CreatePlayer'
import CreateGame from './components/Games/CreateGame/CreateGame'
import CreateMatch from './components/Matches/CreateMatch/CreateMatch'
import Navigation from './components/Navigation/Navigation'

import { DbTableView } from './components/DbTableView/DbTableView';
import CreateTournament from './components/Tournaments/CreateTournament/CreateTournament';
import CreateRandomMatch from './components/Matches/CreateRandomMatch/CreateRandomMatch';

function App() {
  return (
    <>
        <div className="wrapper">
            <Navigation />

            <div className="body" data-bs-theme="dark">
                <BrowserRouter>
                    <Routes>
                        <Route path="/" />
                        <Route path="players/create" element={<CreatePlayer />} />
                        <Route path="players/search" element={<DbTableView context="players" />} />
                        <Route path="clients/create" element={<CreateClient />} />
                        <Route path="clients/search" element={<DbTableView context="clients" />} />
                        <Route path="matches/create" element={<CreateMatch />} />
                        <Route path="matches/search" element={<DbTableView context="matches" />} />
                        <Route path="matches/random" element={<CreateRandomMatch />} />
                        <Route path="games/create" element={<CreateGame />} />
                        <Route path="games/search" element={<DbTableView context="games" />} />
                        <Route path="tournaments/create" element={<CreateTournament />} />
                        <Route path="tournaments/search" element={<DbTableView context="tournaments" />} />
                    </Routes>
                </BrowserRouter>
            </div>
        </div>
    </>
  );
}

export default App;
