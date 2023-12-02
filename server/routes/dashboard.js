const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");
const battler = require("../middleware/battler");

//main dashboard and character display
router.get("/", authorization , async(req , res) => {
    try {
        //grab the user id
        const id = req.header("token");

        //grab the character relative to that user
        const character = await pool.query("SELECT * FROM Users WHERE user_id = $1", [id]);

        //output the users information
        res.json(character.rows);
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//class list
router.get("/classes", authorization , async(req , res) => {
    try {
        //output class informaiton
        const classes = await pool.query("SELECT * FROM Class");
        
        res.json(classes.rows);

        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//class ability list note: no description exists, so the information is quite cryptic
router.get("/class-abilities", authorization , async(req , res) => {
    try {

        //output the class abilities, relative to the class selected
        //1. deconstruct req.body
        const {class_select} = req.body;

        //2. grab the given abilities
        const abilities = await pool.query ("SELECT * FROM Class_abilities WHERE classname = $1", [class_select]);
        
        //3. output abilities
        res.json(abilities.rows);

        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//race list
router.get("/races", authorization , async(req , res) => {
    try {

        //grab races
        const races = await pool.query("SELECT * FROM Races");
    
        //output races
        res.json(races);
        
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//race abilities + immunities
router.get("/race-abilities", authorization , async(req , res) => {
    try {

        //deconstruct req.body
        const {race} = req.body;

        //complex query, grab race abilities and immunities based on the given race in req.body
        const abilities = await pool.query ("SELECT * FROM Race_abilities WHERE racename = $1 INNER JOIN Immunities ON Race_abilities.racename = Immunities.racename" , [race]);

        //output the complex query
        res.json(abilities.rows);
        
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//character creation, confirmation is done through the frontend
router.put("/create", authorization , async(req , res) =>{
try {

    //creates a character based on the selected stats
    //1. deconstruct req.body
    const{Char_race , Char_class , STR_select , DEX_select , STM_select , WIS_select , RES_select , LCK_select , Skill_points} = req.body;
    //2. grab user id
    const id = req.header("token");

    //3. check if skill points are properly distributed, otherwise throw error
    if(Skill_points !== 10)
    {
        return res.status(401).send("Incorrect point distribution");
    }
    //4. check if skill points exist, otherwise throw error
    else if (Skill_points === 0)
    {
        return res.status(401).send("You already have a character")
    }

    //5. grab the information of the race selected from req.body and store it
    const raceQuery = await pool.query("SELECT * FROM Races WHERE Race_name = $1" , [Char_race]);
    const raceStats = raceQuery.rows[0];

    //6. grab the information of the class selected from req.body and store it
    const classQuery = await pool.query("SELECT * FROM Class WHERE Class_name = $1" , [Char_class]);
    const classMods = classQuery.rows[0];


    //7. calculate all of the character stats respective to the combined race and class features
    const HP = raceStats.base_hp + classMods.hp_mod;
    const MP = raceStats.base_mp + classMods.mp_mod;
    const EN = raceStats.base_en + classMods.en_mod;
    const STR = raceStats.str_bonus + classMods.str_bonus + STR_select;
    const DEX = raceStats.dex_bonus + classMods.dex_bonus + DEX_select;
    const STM = raceStats.stm_bonus + classMods.stm_bonus + STM_select;
    const WIS = raceStats.wis_bonus + classMods.wis_bonus + WIS_select;
    const RES = raceStats.res_bonus + classMods.res_bonus + RES_select;
    const LCK = raceStats.lck_bonus + classMods.lck_bonus + LCK_select;

    //8. create a character by using an update query to update the respective user with the information from step 7
    const createchar = await pool.query("UPDATE Users SET Char_race = $1 , Char_class = $2 , HP = $3 , MP = $4 , EN = $5 , STR = $6 , DEX = $7 , STM = $8 , WIS = $9 , RES = $10 , LCK = $11 , Skill_points = 0 WHERE User_id = $12", 
    [Char_race, Char_class , HP , MP , EN , STR , DEX, STM , WIS , RES , LCK , id]);

    //9. output the new character
    res.json(createchar);

} catch (err) {
    console.error(err.message);
    res.status(500).json("Server Error");
}
});
//chat display
router.get("/chat", authorization , async (req , res) =>{
    try {
        
        //grab the chat information
        const display = await pool.query("SELECT * FROM Chat_log");

        //display all chat information
        res.json(display.rows);

    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//enter a message into chat
router.post("/chat-post" , authorization , async (req , res) => {
    try {

        //deconstruct req.body
        const {message} = req.body;
        //grab user id
        const id = req.header("token");

        //grab the sender (user name) and store it
        const sender = await pool.query("SELECT User_name FROM Users WHERE User_id = $1", [id]);
        const sender_name = sender.rows[0].user_name

        //insert the new message into chat table
        const upload = await pool.query("INSERT INTO Chat_log (Message_body , Sender) VALUES ($1 , $2) RETURNING *" , [message , sender_name]);

        //output success verificaiton
        res.json(true);

    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//view active battles
router.get("/battles" , authorization , async (req , res) =>{
    try {

        //grab all battles that are in the active state
        const battles = await pool.query("SELECT * FROM Battle WHERE Battle_state = 'Active'");
        //output the active battles to the given user
        res.json(battles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//view battles you are in
router.get("/my-battles" , authorization , async (req , res) =>{
    try {
        //grab user id
        const id = req.header("token");
        //grab user name based on id
        const name = await pool.query("SELECT User_name FROM Users WHERE User_id = $1", [id]);
        //grab all battles that are either started or have the users name in them, which indicates they are underway
        const mybattles = await pool.query("SELECT * FROM Battle WHERE Battle_state = 'Started' AND (Participant_1 = $1 OR Participant_2 = $1)" , [name.rows[0].user_name]);
        //output those battles
        res.json(mybattles.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//create battle
router.post("/battle" , authorization , async (req , res) => {
    try {
        //grab user id
        const id = req.header("token");
        //grab the users character information and store it
        const grab_contestant = await pool.query("SELECT * FROM Users WHERE User_id = $1" , [id]);
        contestant = grab_contestant.rows[0];

        //create a new battle and populate the participant 1 information with the respective user
        const create_battle = await pool.query("INSERT INTO Battle (Battle_Id , Participant_1 , Participant_1_HP , Participant_1_MP , Participant_1_EN , Participant_1_STR , Participant_1_DEX , Participant_1_STM , Participant_1_WIS , Participant_1_RES , Participant_1_LCK , Battle_state) VALUES (gen_random_uuid(), $1 , $2 , $3 , $4 , $5 , $6 , $7 , $8 , $9 , $10 , 'Active') RETURNING Battle_Id",
        [contestant.user_name , contestant.hp , contestant.mp , contestant.en , contestant.str , contestant.dex , contestant.stm , contestant.wis , contestant.res , contestant.lck]);

        //output the battle information
        res.json(create_battle);

    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//join battle
router.put("/join-battle" , authorization , async (req , res) => {
   
   try {
    //deconstruct req.body
    const {battleid} = req.body;
    //grab user id
    const id = req.header("token");

    //grab the user name and the id of the battle
    const usercheck = await pool.query("SELECT * FROM Users WHERE User_id = $1", [id]);
    const battlecheck = await pool.query("SELECT * FROM Battle WHERE Battle_Id = $1 AND Participant_1 = $2" , 
    [battleid , usercheck.rows[0].user_name]);

    //if a battle is present from the previous check, throw an error, as this indicates you are trying to join your own battle
    if(battlecheck.rows.length !== 0)
    {
       return res.status(401).send("This is you");
    }

    //otherwise store the user
    const opponent = usercheck.rows[0];

    //fill the 2nd participant information with the respective user information
    const fillbattle = await pool.query("UPDATE Battle SET Participant_2 = $1 , Participant_2_HP = $2 , Participant_2_MP = $3 , Participant_2_EN = $4 , Participant_2_STR = $5 , Participant_2_DEX = $6 , Participant_2_STM = $7 , Participant_2_WIS = $8 , Participant_2_RES = $9 , Participant_2_LCK = $10 , Battle_state = 'Started' WHERE Battle_Id = $11",
    [opponent.user_name, opponent.hp , opponent.mp, opponent.en , opponent.str , opponent.dex , opponent.stm, opponent.wis, opponent.res , opponent.lck , battleid]);
    
    //output verification success
    res.json(true)

   } catch (err) {
    console.error(err.message);
        res.status(500).json("Server Error");
   }
    

});
//a simple check if the user has joined a given battle
router.get("/joined-battle" , battler,  async (req , res) => {
    try {
        //a simple check to verify if the user is a battler
        res.json(true);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;