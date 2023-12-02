import React, {Fragment , useState} from 'react';
import './App.css';

import {BrowserRouter as Router , Route , Redirect , Switch} from "react-router-dom";

//renders
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import Login from './components/Login';
import Battle from './components/Battle';

function App() {
  //declares the variables in use, authentication and participant are used for dashboard and battle respectively
  const [isAuthenticated , setIsAuthenticated] = useState(false);
  const [isParticipant , setisParticipant] = useState(false);
  const setAuth = boolean => {
    setIsAuthenticated(boolean);
  }
  const setPart = boolean => {
    setisParticipant(boolean);
  }
  //the return does the following.
  //creates a flexible window
  //renders a given route based on what webpage is loaded
  //runs the switch statement for reach route to ensure the statements are either true or false
  //for example. if login is accessed, but auth is true, then you are redirected to the dashboard
  //KNOWN ISSUE: THE WEBPAGE DOESNT PROPERLY REBUILD UPON REDIRECTION IN ITS CURRENT STATE
  return (
      <Fragment>
        <Router>
          <div className='container'>
            <Switch>

              <Route path ="/login" 
              render ={props => !isAuthenticated ? 
                (<Login {...props} setAuth = {setAuth}/>) : 
                <Redirect to="/dashboard"/>} />

              <Route path ="/register" 
              render ={props => !isAuthenticated ?
               <Register {...props} setAuth = {setAuth}/> :
               <Redirect to="/login"/>} />

              <Route path ="/dashboard"
              render ={props => isAuthenticated ? (
                <Dashboard {...props} setAuth = {setAuth}/> ):
                <Redirect to="/login"/>} />
 
             <Route path ="/battle"
              render ={props => isParticipant ? 
                <Battle {...props} setPart = {setPart}/> :
                <Redirect to="/dashboard"/>} />
              
            </Switch>
          </div>
          </Router>
      </Fragment>
  );
}

export default App;
