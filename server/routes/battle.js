const router = require("express").Router();
const pool = require("../db");

const battler = require("../middleware/battler");

router.put("/", battler , async(req , res) => {
    try {
        //grab the battle id and the respective battle
        const battleid = req.header("battletoken");
        const battlers = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);

        //check if any participant has dropped to or below 0hp, indicating the end of the battle
        if(battlers.rows[0].participant_1_hp <= 0 || battlers.rows[0].participant_2_hp <= 0){
            //updates the battle to indicate its conclusion
            const end = await pool.query ("UPDATE Battle SET Battle_state = 'Concluded' WHERE Battle_id = $1" , [battleid]);
            //checks which user is <= 0 hp, gives rewards to the user which ISNT
            if(battlers.rows[0].participant_1_hp <= 0){
                const op2 = await pool.query("UPDATE Users SET Char_level = Char_level + 1 WHERE User_name = $1" , [battlers.rows[0].participant_2]);
            }
            else{
                const op1 = await pool.query("UPDATE Users SET Char_level = Char_level + 1 WHERE User_name = $1" , [battlers.rows[0].participant_1]);
            }
            //output the results of the battle, though it is generally vague 
            res.json("One opponent has fallen, the battle has ended!")
        }
        else{
            //if a battler isnt at 0hp, output the current state of the battle
            res.json(battlers.rows);
        }
        
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//rolling initiative, which starts battle, determines turn order, and is rerolled in the event of a clash
router.put("/initiative", battler , async(req , res) => {
    try {

        //grab the user id and the battle id
        const userid = req.header("token");
        const battleid = req.header("battletoken");

        //grab the user name
        const username = await pool.query("SELECT User_name FROM Users WHERE User_id = $1" , [userid]);

        //roll a d20
        const dice = Math.floor(Math.random() * 20) + 1;

        //check which user is which battler in this battle
        const participantcheck = await pool.query("SELECT * FROM Battle WHERE Battle_Id = $1" , [battleid]);

        //set the initiative of the respective battler to the number provided by dice plus their DEX
        if(participantcheck.rows[0].participant_1 === username.rows[0].user_name){
            const initiative = await pool.query("UPDATE Battle SET Initiative_1 = $1 + (SELECT Participant_1_DEX FROM Battle WHERE Battle_Id = $2) WHERE Battle_Id = $2", 
            [dice , battleid]);
        }
        else{
            const initiative = await pool.query("UPDATE Battle SET Initiative_2 = $1 + (SELECT Participant_2_DEX FROM Battle WHERE Battle_Id = $2) WHERE Battle_Id = $2", 
            [dice , battleid]);
        }

        //run a new check with the updated numbers to determine turn order
        const newcheck = await pool.query("SELECT * FROM Battle WHERE Battle_Id = $1" , [battleid]);

        //check if the initiative has been rolled for both players, otherwise skip this step
        if(newcheck.rows[0].initiative_1 !== 0 && newcheck.rows[0].initiative_2 !== 0){
            //replace the battle state with the respective players turn, whoever has the higher roll
            if(newcheck.rows[0].initiative_1 > newcheck.rows[0].initiative_2){
                const turndecision = await pool.query("UPDATE Battle SET Battle_state = $1 WHERE Battle_id = $2", [participantcheck.rows[0].participant_1 , battleid]);
            }
            else{
                const turndecision = await pool.query("UPDATE Battle SET Battle_state = $1 WHERE Battle_id = $2", [participantcheck.rows[0].participant_2 , battleid]);
            }
        }
        //output the roll of the dice
        res.json(dice);

    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//get relavent player information relative to their level. Note this query might be buggy under certain combinations and will not list all class abilities if their phases dont match
router.get("/abilities", battler , async(req , res) => {
    try {
        //grab user and battle id
        const id = req.header("token");
        const battleid = req.header("battletoken");
        //grab the current turn of the battle
        const turn = await pool.query("SELECT Battle_state FROM Battle WHERE Battle_id = $1" , [battleid]);

        //grab the user name respective to the user id
        const user = await pool.query("SELECT * FROM Users WHERE User_id = $1" , [id]);
        //check if it is the users turn, otherwise go to else
        if(turn.rows[0].battle_state === user.rows[0].user_name){
        //grab the users race, class, and level
            const playerrace = user.rows[0].char_race;
        const playerclass = user.rows[0].char_class;
        const level = user.rows[0].char_level;

        //complex query, grab class abilities and race abilities. This is based on phase matching and level requirement
        const abilities = await pool.query("SELECT Class_abilities.* FROM Class_abilities LEFT JOIN (SELECT * FROM Race_abilities WHERE racename = $1 AND Level_req <= $3) AS Race_abilities ON Class_abilities.Phase = Race_abilities.Phase WHERE Class_abilities.classname = $2 AND Class_abilities.Level_req <= $3;" ,
        [playerrace , playerclass , level]);

        //output the abilities the player can use
        res.json(abilities.rows);
        }
        //display that is isnt their turn
        else{
            res.json("It's not your turn.");
        }
        
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
/*
THIS IS OLD CODE THAT HAS NEITHER BEEN TESTED NOR IS IT IN USE  
ITS ORIGINAL PURPOSE WAS TO CHECK IF ANY PLAYER WAS AN ELF AND 
PUT THEM IN STEALTH UPON A SUCCESSFUL INITIATIVE CHECK

router.post("/init-trigger" , battler , async(req , res) =>{
    try {
        const id = req.header("token");
        const battleid = req.header("battletoken");
        const user = await pool.query("SELECT * FROM Users WHERE User_id = $1" , [id]);
        const battle = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);

        const playername = user.rows[0].user_name;
        const playerrace = user.rows[0].char_race;
        
        if(playerrace === "Elf" && (battle.rows[0].initiative_1 !== 0 && battle.rows[0].initiative_2 !== 0))
        {
            const duration = Math.floor(Math.random() * 4) + 2;
            if(battle.rows[0].participant_1 === playername && battle.rows[0].initiative_1 > battle.rows[0].initiative_2){
              const effect = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)" , 
              [battleid , "Stealth" , duration , playername]);  
              return res.json(playername + " uses a surprise attack and goes stealth!");
            }
            else if (battle.rows[0].participant_2 === playername && battle.rows[0].initiative_2 > battle.rows[0].initiative_1){
                const effect = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)" , 
                [battleid , "Stealth" , duration , playername]);  
               return res.json(playername + " uses a surprise attack and goes stealth!");
            }
        }
        res.status(401).send("Insufficient Conditions");
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
*/
//turn start calculation. purely done for status effects
router.put("/turn-start", battler , async(req , res) => {
    try {
        //grab the user and battle id
        const id = req.header("token");
        const battleid = req.header("battletoken");

        //grab the user and battle information
        const user = await pool.query("SELECT * FROM Users WHERE User_id = $1" , [id]);
        const battle = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);

        //store the user name information
        const username = user.rows[0].user_name;

        //check if there are any effects currently applied to the user
        const effects = await pool.query("SELECT Effect_name FROM Active_effects WHERE Applied_to = $1" , [username]);
       
            //run a loop based on the number of effects the user is affected by
            for(let i = 0; i < effects.rows.length; i++){

            //grab the effect in question (if there is any)
            const effect = await pool.query("SELECT * FROM Effects WHERE Effect_name = $1" , [effects.rows[i].effect_name]);

            //if there is no effect, skip this step
            if(effect.rows.length !== 0)
            {
                //apply the effects damage to the respective user (if it does any damage)
                if(battle.rows[0].participant_1 === username){
                    const apply = await pool.query("UPDATE Battle SET Participant_1_HP = Participant_1_HP + $1 WHERE Battle_id = $2" , [effect.rows[0].hp_mod , battleid]);
                }
                else{
                    const apply = await pool.query("UPDATE Battle SET Participant_2_HP = Participant_2_HP + $1 WHERE Battle_id = $2" , [effect.rows[0].hp_mod , battleid]);
                }
            }

        }
        //update all effects on a current user, ticking them down a round
        const effect_tick = await pool.query("UPDATE Active_effects SET Rounds_left = Rounds_left - 1 WHERE Applied_to = $1 RETURNING *" , [username]);

        //grabs all the effects on a given user that are currently at 0 rounds left
        const effect_update = await pool.query("SELECT * FROM Active_effects WHERE Rounds_left = 0 AND Applied_to = $1" , [username]);


        //check all the rows that have been affected and loop through them
        for(let i = 0; i < effect_update.rows.length; i++){

            //grab the specific effect in question
            const effect = await pool.query("SELECT * FROM Effects WHERE Effect_name = $1" , [effect_update.rows[i].effect_name]);

            //grab the specific effect name and duration for a very specific ability
            const aftereffect = await pool.query("SELECT Effect_name , Duration FROM Active_effects WHERE Effect_name = $1" , [effect_update.rows[i].effect_name]);

            //if the effect is called the specific name as shown below, then execute the contents below
            if(aftereffect.rows[0].effect_name === "Berserk-Power" || aftereffect.rows[0].effect_name === "Berserk-Adrenaline"){

                //declare an exhaustion time, based on the duration of the previous effect
                const exhausttime = aftereffect.rows[0].duration;    

                //grab the stat modifiers for a specific effect based on what the effect is            
                const exhaust = await pool.query("SELECT * FROM Class_abilities WHERE Class_ability = $1" , [aftereffect.rows[0].effect_name]);

                //apply said effects to the respective user
                if(battle.rows[0].participant_1 === username){

                    //this line of code will technically revert the effects if there are any effects to revert
                    const undo = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR - $1 , Participant_1_DEX = Participant_1_DEX - $2 , Participant_1_STM = Participant_1_STM - $3 , Participant_1_WIS = Participant_1_WIS - $4 , Participant_1_RES = Participant_1_RES - $5 , Participant_1_LCK = Participant_1_LCK - $6 WHERE Battle_id = $7",
                    [exhaust.rows[0].str_mod , exhaust.rows[0].dex_mod , exhaust.rows[0].stm_mod , exhaust.rows[0].wis_mod , exhaust.rows[0].res_mod , exhaust.rows[0].lck_mod , battleid]);

                    //this line of code applies the exhaustion effect to the user once the reversion is done, which ironically doesn't do anything in this current version
                    const exhaustion = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)",
                    [battleid , "Exhaustion" , exhausttime , username]);
                }
                //the else statement is the same thing as the previous if statement, just to the 2nd user instead of the 1st
                else{
                    const undo = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR - $1 , Participant_2_DEX = Participant_2_DEX - $2 , Participant_2_STM = Participant_2_STM - $3 , Participant_2_WIS = Participant_2_WIS - $4 , Participant_2_RES = Participant_2_RES - $5 , Participant_2_LCK = Participant_2_LCK - $6 WHERE Battle_id = $7",
                    [exhaust.rows[0].str_mod , exhaust.rows[0].dex_mod , exhaust.rows[0].stm_mod , exhaust.rows[0].wis_mod , exhaust.rows[0].res_mod , exhaust.rows[0].lck_mod , battleid]);
                    const exhaustion = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)",
                    [battleid , "Exhaustion" , exhausttime , username]);
                }
            }
            
            //checks if the effect in question exists, otherwise, skips this step
            if(effect.rows.length !== 0)
            {

            //checks if the effect is stun, otherwise skips this step
            if(effect.rows[0].effect_name === "Stun"){

                //if the effect is stun, then the user loses their turn
                if(battle.rows[0].participant_1 === username){
                    const endturn = await pool.query("UPDATE Battle SET Battle_state = $1",[battle.rows[0].participant_2]);
                }
                else{
                    const endturn = await pool.query("UPDATE Battle SET Battle_state = $1",[battle.rows[0].participant_1]);
                }
            }
            //checks if the effect is a status effect otherwise skips this step
            else if(effect.rows[0].effect_type === "Status"){

                //if the effect is a status effect, then it looks for the respective user affected and reverses the stats changed by the effect
                if(battle.rows[0].participant_1 === username){
                    const undo = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR - $1 , Participant_1_DEX = Participant_1_DEX - $2 , Participant_1_STM = Participant_1_STM - $3 , Participant_1_WIS = Participant_1_WIS - $4 , Participant_1_RES = Participant_1_RES - $5 , Participant_1_LCK = Participant_1_LCK - $6 WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
                else{
                    const undo = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR - $1 , Participant_2_DEX = Participant_2_DEX - $2 , Participant_2_STM = Participant_2_STM - $3 , Participant_2_WIS = Participant_2_WIS - $4 , Participant_2_RES = Participant_2_RES - $5 , Participant_2_LCK = Participant_2_LCK - $6 WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
            }
        }
        }
        //removes all effects that are at or less than 0 rounds left (this indicates they have expired)
        const clear_effect = await pool.query("DELETE FROM Active_effects WHERE Rounds_left <= 0");

        //grabs the new battle info
        const newbattle = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);

        //outputs the new battle information
        res.json(newbattle.rows);
        
        
        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//action decision note, actions are labeled poorly, resulting in heavy mixup on what is available
router.put("/act" , battler , async(req , res) => {
    try {
        //grabs the action from req.body
        const { action } = req.body;
        //grabs the user id and battle id
        const id = req.header("token");
        const battleid = req.header("battletoken");
        //grabs the user name and battle
        const user = await pool.query("SELECT User_name FROM Users WHERE User_id = $1" , [id]);
        const battle = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);

        //searches for the ability selected
        const abilityselect = await pool.query("SELECT * FROM Class_abilities WHERE Class_ability = $1" , [action]);
        const raceabilityselect = await pool.query("SELECT * FROM Race_abilities WHERE Ability = $1" , [action]);

        //checks if the ability is defensive, otherwise skips this step
        if(action === "Berserk-Power" || action === "Berserk-Adrenaline" || action === "Defense Stance" || action === "Mist Veil" || action === "Healing" || action === "Purify" || action === "Renew" || action === "Bestow Light" || action === "Holy Shield" || action === "Stone Essence"){
            //looks for the effect in question
            const findeffect = await pool.query("SELECT Effect FROM Class_abilities WHERE Class_ability = $1", [action]);
            //if the effect is not found, and the action is a race ability instead applies the math inside
            if(findeffect.rows.length === 0 && action === "Stone Essence"){
                //generates a random number from 1-6
                const d6 = Math.floor(Math.random() * 6) + 1;
                //runs a check on which stat is increased
                //STR on 1
                //DEX on 2
                //STM on 3
                //WIS on 4
                //RES on 5
                //ALL on 6
                switch(d6) {
                    case 1:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const strup = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const strup = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                    case 2:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const dexup = await pool.query("UPDATE Battle SET Participant_1_DEX = Participant_1_DEX + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const dexup = await pool.query("UPDATE Battle SET Participant_2_DEX = Participant_2_DEX + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                    case 3:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const stmup = await pool.query("UPDATE Battle SET Participant_1_STM = Participant_1_STM + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const stmup = await pool.query("UPDATE Battle SET Participant_2_STM = Participant_2_STM + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                    case 4:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const wisup = await pool.query("UPDATE Battle SET Participant_1_WIS = Participant_1_WIS + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const wisup = await pool.query("UPDATE Battle SET Participant_2_WIS = Participant_2_WIS + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                    case 5:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const resup = await pool.query("UPDATE Battle SET Participant_1_RES = Participant_1_RES + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const resup = await pool.query("UPDATE Battle SET Participant_2_RES = Participant_2_RES + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                    default:
                        if(user.rows[0].user_name === battle.rows[0].participant_1){
                            const allup = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR + 2, Participant_1_DEX = Participant_1_DEX + 2, Participant_1_STM = Participant_1_STM + 2 , Participant_1_WIS = Participant_1_WIS + 2 , Participant_1_RES = Participant_1_RES + 2 , Participant_1_LCK = Participant_1_LCK + 2  WHERE Battle_id = $1" , [battleid]);
                        }
                        else{
                            const allup = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR + 2, Participant_2_DEX = Participant_2_DEX + 2, Participant_2_STM = Participant_2_STM + 2 , Participant_2_WIS = Participant_2_WIS + 2 , Participant_2_RES = Participant_2_RES + 2 , Participant_2_LCK = Participant_2_LCK + 2 WHERE Battle_id = $1" , [battleid]);
                        }
                        break;
                }
                
            }
            //if the effect is berserk power, then it applies the specific abilities modified
            else if (findeffect.rows.length === 1 && action === "Berserk-Power"){
                //rolls for the duration, a random number from 2-5
                const d4 = Math.floor(Math.random() * 4) + 2;
            
                //applies the stat changes to the specific user
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const powerup = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR + $1, Participant_1_STM = Participant_1_STM + $2 WHERE Battle_id = $3" , [abilityselect.rows[0].str_mod , abilityselect.rows[0].stm_mod , battleid]);
                }
                else{
                    
                    const powerup = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR + $1, Participant_2_STM = Participant_2_STM + $2 WHERE Battle_id = $3" , [abilityselect.rows[0].str_mod , abilityselect.rows[0].stm_mod , battleid]);
                }
                //applies the temporary effect to the user in question
                const createtempeffect = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)",
                [battleid , action , d4 , user.rows[0].user_name]);
            }
            //if the effect is purify, removes ALL EFFECTS from that user
            else if(findeffect.rows.length === 0 && action === "Purify"){
                //yes, all effects are deleted from that specific user
                const purify = await pool.query("DELETE FROM Active_Effects WHERE Battle_id = $1 AND Applied_to = $2" , [battleid , user.rows[0].user_name]);
            }
            //otherwise, this means the effect is found from the class ability, and the normal steps are followed
            else{
                //rolls a random number from 2-5
                const d4 = Math.floor(Math.random() * 4) + 2;
                //finds the effect in question
                const effect = await pool.query("SELECT * FROM Effects WHERE Effect_name = $1" , [findeffect.rows[0].effect]);
                //applies the effect to the user
                const tempeffect = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)",
                [battleid , findeffect.rows[0].effect , d4 , user.rows[0].user_name]);

                //changes the stats of the user (if applicable)
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const apply = await pool.query("UPDATE Battle SET  Participant_1_STR = Participant_1_STR + $1, Participant_1_DEX = Participant_1_DEX + $2, Participant_1_STM = Participant_1_STM + $3 , Participant_1_WIS = Participant_1_WIS + $4 , Participant_1_RES = Participant_1_RES + $5 , Participant_1_LCK = Participant_1_LCK + $6  WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
                else{
                    const apply = await pool.query("UPDATE Battle SET  Participant_2_STR = Participant_2_STR + $1, Participant_2_DEX = Participant_2_DEX + $2, Participant_2_STM = Participant_2_STM + $3 , Participant_2_WIS = Participant_2_WIS + $4 , Participant_2_RES = Participant_2_RES + $5 , Participant_2_LCK = Participant_2_LCK + $6  WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
            }
            
            
        }
        //checks if the action is sharpshooter (this is still technically an attack, but is declared BEFORE ATTACKING)
        else if(action === "Sharpshooter"){
            //applies the sharpshooter effect to the user
            const sharpshot = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)" ,
            [battleid , "Sharpshooter" , 1 , user.rows[0].user_name]);

            //applies the changes to the user
            if(user.rows[0].user_name === battle.rows[0].participant_1){
                const aim = await pool.query("UPDATE Battle SET Participant_1_DEX = Participant_1_DEX + 5 WHERE Battle_id = $1" , [battleid]);
            }
            else{
                const aim = await pool.query("UPDATE Battle SET Participant_2_DEX = Participant_2_DEX + 5 WHERE Battle_id = $1" , [battleid]);
            }
            //rolls to attack, which can range from 1-20
            var d20 = Math.floor(Math.random() * 20) + 1;

            //if the roll is a 1, then it is a critical fail, which means the number will always be 1
            if(d20 === 1){
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const critfail = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
                else{
                    const critfail = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
            }
            //if the number is a 20, then it is a critical hit. There is no way to indicate this, so it is set to 99 and reverted later on when calculating damage
            else if (d20 === 20){
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const critical = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [99 , battleid]);
                }
                else{
                    const critical = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [99 , battleid]);
                }
            }
            //if a crit or crit fail isnt rolled, then a basic roll is made, modified by the users luck/3 (rounded down)
            else{
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    d20 = d20 + Math.floor(battle.rows[0].participant_1_lck / 3);
                    const shoot = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
                else{
                    d20 = d20 + Math.floor(battle.rows[0].participant_2_lck / 3);
                    const shoot = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
            }
        }
        //if the action isnt passing the turn, then it is assumed to be a basic attack
        else if(action !== "Pass"){

            //the same rolling rules for sharpshooter are applied here
            var d20 = Math.floor(Math.random() * 20) + 1;

            //critical fail condition
            if(d20 === 1){
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const critfail = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
                else{
                    const critfail = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
            }
            //critical hit condition (set to 99 for simplicity and reverted later)
            else if (d20 === 20){
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const critical = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [99 , battleid]);
                }
                else{
                    const critical = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [99 , battleid]);
                }
            }
            //basic roll + luck/3 (rounded down)
            else{
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    d20 = d20 + Math.floor(battle.rows[0].participant_1_lck / 3);
                    const attack = await pool.query("UPDATE Battle SET Participant_1_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
                else{
                    d20 = d20 + Math.floor(battle.rows[0].participant_2_lck / 3);
                    const attack = await pool.query("UPDATE Battle SET Participant_2_roll = $1 WHERE Battle_id = $2" , [d20 , battleid]);
                }
            }
        } 
            //ends the users turn afterwards
            if(user.rows[0].user_name === battle.rows[0].participant_1){
                const endturn = await pool.query("UPDATE Battle SET Battle_state = $1 WHERE Battle_id = $2" , [battle.rows[0].participant_2 , battleid])
            }
            else{
                const endturn = await pool.query("UPDATE Battle SET Battle_state = $1 WHERE Battle_id = $2" , [battle.rows[0].participant_1 , battleid]);
            }
        //outputs the users action, if there is a roll, then the roll is used, otherwise, it just displays the action
        if(!d20){
            res.json(user.rows[0].user_name + " uses " + action + "!");
        }
        else{
            res.json(user.rows[0].user_name + " uses " + action + " and rolls a " + d20 + "!");
        }
        

    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
//response route, determines what the defender responds with
router.put("/response", battler , async(req , res) => {
    try {
        //deconstructs req.body
        const {action , response} = req.body;
        //grabs the battle and user id
        const battleid = req.header("battletoken");
        const id = req.header("token");
        //grabs the battle and username
        const battle = await pool.query("SELECT * FROM Battle WHERE Battle_id = $1" , [battleid]);
        const user = await pool.query("SELECT User_name FROM Users WHERE User_id = $1" , [id]);

        //rolls the dice
        const d20 = Math.floor(Math.random() * 20) + 1;

        //checks for criticals, crit fails, and basic rolls
        if(d20 === 20){
            if(user.rows[0].user_name === battle.rows[0].participant_1){
                const critical = await pool.query("UPDATE Battle SET Participant_1_response = $1 WHERE Battle_id = $2", [99 , battleid]);
            }
            else{
                const critical = await pool.query("UPDATE Battle SET Participant_2_response = $1 WHERE Battle_id = $2", [99 , battleid]);
            }
        }
        else if(d20 === 1){
            if(user.rows[0].user_name === battle.rows[0].participant_1){
                const critfail = await pool.query("UPDATE Battle SET Participant_1_response = $1 WHERE Battle_id = $2", [1 , battleid]);
            }
            else{
                const critfail = await pool.query("UPDATE Battle SET Participant_2_response = $1 WHERE Battle_id = $2", [1 , battleid]);
            }
        }
        else{
            if(user.rows[0].user_name === battle.rows[0].participant_1){
                const dodge = await pool.query("UPDATE Battle SET Participant_1_response = $1 WHERE Battle_id = $2", [d20 + Math.floor(battle.rows[0].participant_1_lck / 3), battleid]);   
            }
            else{
                const roll = await pool.query("UPDATE Battle SET Participant_2_response = $1 WHERE Battle_id = $2", [d20 + Math.floor(battle.rows[0].participant_2_lck / 3), battleid]);
            }
        }
        //if the roll is a success, then no damage is taken, and any crits are reversed to prevent absurd damage numbers
        if(user.rows[0].user_name === battle.rows[0].participant_1 && (battle.rows[0].participant_1_response > battle.rows[0].participant_2_roll)){
            if(response === "Counter"){
                if(d20 === 20)
                {
                    //crits are reverted in this case
                    const revertcrit = await pool.query("UPDATE Battle SET Participant_1_response = $1 WHERE Battle_id = $2", [d20 + Math.floor(battle.rows[0].participant_1_lck / 3) , battleid]);
                }
                //since this is a counter, damage is reversed to the attacker
                const reversal = await pool.query("UPDATE Battle SET Participant_2_HP = Participant_2_HP - (Participant_1_response - Participant_2_roll) WHERE Battle_id = $1" , [battleid]);
            }
            //the results are displayed
            res.json(user.rows[0].user_name + " successfully responds with a " + response);
        }
        //same check but for the other user, basically vice versa
        else if(user.rows[0].user_name === battle.rows[0].participant_2 && (battle.rows[0].participant_2_response > battle.rows[0].participant_1_roll)){
            if(response === "Counter"){
                if(d20 === 20)
                {
                    const revertcrit = await pool.query("UPDATE Battle SET Participant_2_response = $1 WHERE Battle_id = $2", [d20 + Math.floor(battle.rows[0].participant_2_lck / 3) , battleid]);
                }
                const reversal = await pool.query("UPDATE Battle SET Participant_1_HP = Participant_1_HP - (Participant_2_response - Participant_1_roll) WHERE Battle_id = $1" , [battleid]);
            }
            res.json(user.rows[0].user_name + " successfully responds with a " + response);
        }
        //this means if the dodge/counter fails
        else{
            //firstly an effect is determined if the effect had one
            const determineeffect = await pool.query("SELECT Effect FROM Class_abilities WHERE Class_ability = $1" , [action]);
            //checks if there is, otherwise skips this step
            if(determineeffect.rows.length !== 0){
                //determines the effect duration
                const d4 = Math.floor(Math.random() * 4) + 2;

                //finds the effect in question
                const effect = await pool.query("SELECT * FROM Effects WHERE Effect_name = $1" , [determineeffect.rows[0].effect]);
                //applies the effect to the user
                const applyeffect = await pool.query("INSERT INTO Active_effects (Battle_id , Effect_name , Duration , Rounds_left , Applied_to) VALUES ($1 , $2 , $3 , $3 , $4)" ,
                [battleid , determineeffect.rows[0].effect_name, d4 , user.rows[0].user_name]);
                //modifies the effected users stats
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const activateeffect = await pool.query("UPDATE Battle SET Participant_1_STR = Participant_1_STR + $1 , Participant_1_DEX = Participant_1_DEX + $2 , Participant_1_STM = Participant_1_STM + $3 , Participant_1_WIS = Participant_1_WIS + $4 , Participant_1_RES = Participant_1_RES + $5 , Participant_1_LCK = Participant_1_LCK + $6 WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
                else{
                    const activateeffect = await pool.query("UPDATE Battle SET Participant_2_STR = Participant_2_STR + $1 , Participant_2_DEX = Participant_2_DEX + $2 , Participant_2_STM = Participant_2_STM + $3 , Participant_2_WIS = Participant_2_WIS + $4 , Participant_2_RES = Participant_2_RES + $5 , Participant_2_LCK = Participant_2_LCK + $6 WHERE Battle_id = $7",
                    [effect.rows[0].str_mod , effect.rows[0].dex_mod , effect.rows[0].stm_mod , effect.rows[0].wis_mod , effect.rows[0].res_mod , effect.rows[0].lck_mod , battleid]);
                }
                
            }
            //this line of code doesn't really do anything. it was supposed to, but was removed as a feature
            const conditional = await pool.query("SELECT * FROM Class_abilities WHERE Class_ability = $1" , [action]);
            //declared beforehand because otherwise an error is thrown
                var useropponent;
                //this snippet of code will reverse search for the opponents class, which is unfortunately a very lengthy process, each class has a specific modifier for damage
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const opponent = await pool.query("SELECT Participant_2 FROM Battle WHERE Battle_id = $1" , [battleid]);
                    useropponent = await pool.query("SELECT Char_class FROM Users WHERE User_name = $1" , [opponent.rows[0].participant_2]);
                }
                else{
                    const opponent = await pool.query("SELECT Participant_1 FROM Battle WHERE Battle_id = $1" , [battleid]);
                    useropponent = await pool.query("SELECT Char_class FROM Users WHERE User_name = $1" , [opponent.rows[0].participant_1]);
                }
                const oppclass = await pool.query("SELECT Atk_modifier FROM Class WHERE Class_name = $1" , [useropponent.rows[0].char_class]);
                //after this point, damage will be calculated for the class, since corners are being cut, some features are being ignored here, and most attacks/actions will be basic
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    //checks which attack modifier is being used for the respective user
                    if(oppclass.rows[0].atk_modifier === "STR")
                    {
                        const damage = await pool.query("UPDATE Battle SET Participant_1_HP = Participant_1_HP - Participant_2_roll - Participant_2_STR WHERE Battle_id = $1" , [battleid]);
                    }
                    //checks which attack modifier is being used for the respective user
                    else if(oppclass.rows[0].atk_modifier === "DEX"){
                        const damage = await pool.query("UPDATE Battle SET Participant_1_HP = Participant_1_HP - Participant_2_roll - Participant_2_DEX WHERE Battle_id = $1" , [battleid]);
                    }
                    //checks which attack modifier is being used for the respective user
                    else{
                        const damage = await pool.query("UPDATE Battle SET Participant_1_HP = Participant_1_HP - Participant_2_roll - Participant_2_WIS WHERE Battle_id = $1" , [battleid]);
                    }
                }
                else{
                    //checks which attack modifier is being used for the respective user
                    if(oppclass.rows[0].atk_modifier === "STR")
                    {
                        const damage = await pool.query("UPDATE Battle SET Participant_2_HP = Participant_2_HP - Participant_1_roll - Participant_1_STR WHERE Battle_id = $1" , [battleid]);
                    }
                    //checks which attack modifier is being used for the respective user
                    else if(oppclass.rows[0].atk_modifier === "DEX"){
                        const damage = await pool.query("UPDATE Battle SET Participant_2_HP = Participant_2_HP - Participant_1_roll - Participant_1_DEX WHERE Battle_id = $1" , [battleid]);
                    }
                    //checks which attack modifier is being used for the respective user
                    else{
                        const damage = await pool.query("UPDATE Battle SET Participant_2_HP = Participant_2_HP - Participant_1_roll - Participant_1_WIS WHERE Battle_id = $1" , [battleid]);
                    }
                }
            //checks if the failed response is a counter, as failed counters cost the defender their turn
           if(response === "Counter" && user.rows[0].user_name === battle.rows[0].battle_state){
                if(user.rows[0].user_name === battle.rows[0].participant_1){
                    const loseturn = await pool.query("UPDATE Battle SET Battle_state = Participant_2 WHERE Battle_id = $1" , [battleid]);
                }
                else{
                    const loseturn = await pool.query("UPDATE Battle SET Battle_state = Participant_1 WHERE Battle_id = $1" , [battleid]);
                }
            }
            //outputs the failure to dodge/counter
            res.json(user.rows[0].user_name + " fails their " + response + " and takes damage!") 
        } 


        
    } catch (err) {
        console.error(err.message);
        res.status(500).json("Server Error");
    }
});
module.exports = router;