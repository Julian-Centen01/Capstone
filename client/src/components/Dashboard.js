import React, { Fragment , useState , useEffect } from "react";
//this code is entirely untested as the dashboard in its current state cannot build. but i will explain to the best of my ability what it is meant to do

const Dashboard = ({ setAuth , setPart }) => {

    //multiple inputs are declared for the purpose of building a character. at this point. chat features are removed
    const [inputs, setInputs] = useState({
        Char_class:"",
        Char_race:"",
        STR_select: 0 , 
        DEX_select: 0 , 
        STM_select: 0 , 
        WIS_select: 0 , 
        RES_select: 0 , 
        LCK_select: 0 , 
        Skill_points: 0
    });
    //attributes/stats are set to 0 to indicate their current status
        const [attributes , setAttributes] = useState({
            STR: 0,
            DEX: 0,
            STM: 0,
            WIS: 0,
            RES: 0,
            LCK: 0
        });

        //skill points are declared to a generic value, which should change when a completed character is introduced
        const [totalSP , setTotalSP] = useState(10);

        //two arrays for race and class are present, to display all the available classes and races
        const[raceOpt , setRaceOpt] = useState([]);
        const[classOpt , setClassOpt] = useState([]);

        //this is meant to handle increments of attributes, but went unimplemented. The idea was to have a +/- button to increment/decrement the value
        //this was meant to store the value and the increment/decrement and update the value accordingly, while also updated the total used skill points
        const handleAttributeChange = (attribute , value) => {
            const newAttributes = { ...attributes , [attribute]:value };
            setAttributes(newAttributes);

            const usedSP = Object.values(newAttributes).reduce((total , val) => total + val , 0);
            setTotalSP(10 - usedSP);
        };
        //simple event handler, to manage changes
        const onChange = e =>{
            setInputs({...inputs,  [e.target.name]: e.target.value });
        }

        //a use effect to gather info on the available classes and races.
        //at this point, class abilities and race abilities went ignored for simplicity's sake
        useEffect(() =>{
            fetch('http://localhost:5000/dashboard/races')
                .then((response) => response.json())
                .then((data) => setRaceOpt(data))
                .catch((err) => console.error(err.message));
            fetch('http://localhost:5000/dashboard/classes')
                .then((response) => response.json())
                .then((data) => setClassOpt(data))
                .catch((err) => console.error(err.message));
        }, [])
        //this section of code presents two dropowns called select class and select race.
        //each dropdown functioned similarly in that they are dynamic and based on the previously mentioned array
        //a button also exists to logout
    return (
        <Fragment>
            <h1 className="text-center my-5"> Dashboard </h1>
                <div>
                    <label>Select Class</label>
                   <select value={inputs.Char_class} onChange={onChange}>
                        <option value={""}>Choose a class</option>
                        {classOpt.map((cls) =>(
                            <option key={cls.id} value={cls.name}>
                                {cls.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label>Select Race</label>
                    <select value={inputs.Char_race} onChange={onChange}>
                        <option value ={""}>Choose a race</option>
                        {raceOpt.map((race) => (
                            <option key={race.id} value={race.name}>
                                {race.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    
                                       </div>
                <button onClick={setAuth(false)}>Logout</button>
        </Fragment> 
    );
};

export default Dashboard;