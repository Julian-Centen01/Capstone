const router = require("express").Router();
const pool = require("../db");
const authorization = require("../middleware/authorization");
//register route
router.post("/register" , async (req , res) => {
    try {
        //destructure req.body (name, email, password)
        const {User_name , User_email , User_password} = req.body;

        //check if user exists, throw error if so
        const usercheck = await pool.query("SELECT * FROM Users WHERE User_email = $1 OR User_name = $2" , [User_email , User_name]);

        if(usercheck.rows.length !== 0){
            return res.status(401).send("User already exists");
        }

        //enter new user into the database
        const newUser = await pool.query
        ("INSERT INTO Users (User_name , User_email , User_password) VALUES ($1, $2, $3) RETURNING *", [User_name , User_email , User_password]);

    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

//login route
router.post("/login" , async (req , res) => {
    try {
        //destructure req.body
        const{User_email , User_password} = req.body;

        //check if user doesn't exist, if so, throw error
        const usercheck = await pool.query("SELECT * FROM Users WHERE User_email = $1" , [User_email]);

        if (usercheck.rows.length === 0) {
            return res.status(401).json("Email or Password is invalid");
        }

        //check if password is the same as database password
        if (usercheck.rows[0].user_password !== User_password){
            return res.status(401).json ("Email or Password is invalid");
        }

        const token = (usercheck.rows[0].user_id);

        res.json(token);


    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

router.get("/is-verify" , authorization , async (req , res) => {
    try {
        res.json(true);
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Server Error");
    }
});

module.exports = router;