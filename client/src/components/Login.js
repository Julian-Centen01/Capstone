import React, { Fragment , useState } from "react";
import {Link} from "react-router-dom";

const Login = ({ setAuth }) => {

    const [inputs, setInputs] = useState({
        User_email:"",
        User_password:""
    });

    const {User_email , User_password} = inputs;

    const onChange = e =>{
        setInputs({...inputs,  [e.target.name]: e.target.value });
    }
    const onSubmit = async(e) => {
        e.preventDefault()
        try {
            const body = {User_email , User_password}
            const response = await fetch("http://localhost:5000/auth/login" , {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify(body)
            });    
            
            const parseRes = await response.json();

            localStorage.setItem("token", parseRes);
            setAuth(true);

        } catch (err) {
            console.error(err.message);
        }
    }

    return (
        <Fragment>
            <h1 className="text-center my-5"> Login </h1>
            <form onSubmit={onSubmit}>
                <input 
                    type="email" 
                    name="User_email" 
                    placeholder="email" 
                    className="form-control my-3"
                    value={User_email}
                    onChange= {e => onChange(e)}>
                </input>
                <input
                type="password"
                name="User_password"
                placeholder="password"
                className="form-control my-3"
                value={User_password}
                onChange= {e => onChange(e)}>
                </input>
                <button className="btn btn-success btn-block">Submit</button>
            </form>
            <Link to="/register">Register</Link>
        </Fragment> 
    );
};

export default Login;