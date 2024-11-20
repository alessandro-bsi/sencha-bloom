import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Home from './components/Home';
import DocumentSubmission from './components/DocumentSubmission';
import VerificationAdmin from './components/VerificationAdmin';
import Verification from './components/Verification';
import Rooms from './components/Rooms';
import Chat from './components/Chat';
import Navbar from './ui/Navbar'; // Import Navbar
function App() {
  return (
      <div className="App">
        <Router>
            <Navbar /> {/* Include the Navbar at the top */}
          <Switch>
              <Route path="/" exact component={Home} />
              <Route path="/verify" component={Verification} />
              <Route path="/verification-admin" component={VerificationAdmin} />
              <Route path="/submit-documents" component={DocumentSubmission} />
              <Route path="/rooms" component={Rooms} />
              <Route path="/chat/:roomId" component={Chat} /> {/* Chat for specific room */}
          </Switch>
        </Router>
      </div>
  );
}

export default App;
