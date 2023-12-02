CREATE DATABASE DuelingMasters;

CREATE TABLE Users(
    User_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    User_name VARCHAR(50) NOT NULL,
    User_password VARCHAR(50) NOT NULL,
    User_email VARCHAR(50) NOT NULL,
    Char_level INT DEFAULT 1,
    Char_exp INT DEFAULT 0,
    Char_race VARCHAR(50) DEFAULT '',
    Char_class VARCHAR(50) DEFAULT '',
    HP INT DEFAULT 0,
    MP INT DEFAULT 0,
    EN INT DEFAULT 0,
    STR INT DEFAULT 0,
    DEX INT DEFAULT 0,
    STM INT DEFAULT 0,
    WIS INT DEFAULT 0,
    RES INT DEFAULT 0,
    LCK INT DEFAULT 0,
    Skill_points INT DEFAULT 10
);

CREATE TABLE Races(
    Race_name VARCHAR(50) PRIMARY KEY,
    Base_hp INT NOT NULL,
    Base_mp INT NOT NULL,
    Base_en INT NOT NULL,
    STR_bonus INT NOT NULL,
    DEX_bonus INT NOT NULL,
    STM_bonus INT NOT NULL,
    WIS_bonus INT NOT NULL,
    RES_bonus INT NOT NULL,
    LCK_bonus INT NOT NULL,
    SP_bonus INT NOT NULL
);

CREATE TABLE Race_abilities(
    racename VARCHAR (50) NOT NULL,
    Ability VARCHAR (50) NOT NULL,
    Phase VARCHAR(50) NOT NULL,
    Form VARCHAR(50) NOT NULL,
    Effect VARCHAR(50) NOT NULL,
    Amplification INT NOT NULL,
    Multiplier INT NOT NULL,
    Level_req INT NOT NULL,
    STR_mod INT NOT NULL,
    DEX_mod INT NOT NULL,
    STM_mod INT NOT NULL,
    WIS_mod INT NOT NULL,
    RES_mod INT NOT NULL,
    LCK_mod INT NOT NULL,
    In_effect BOOLEAN NOT NULL,
    Condition VARCHAR (50) NOT NULL,
    CONSTRAINT fk_race FOREIGN KEY(racename) REFERENCES Races(Race_name)
);

CREATE TABLE Immunities(
    racename VARCHAR(50) NOT NULL,
    Immunity VARCHAR(50) NOT NULL,
    CONSTRAINT fk_race FOREIGN KEY(racename) REFERENCES Races(Race_name)
);

CREATE TABLE Effects(
    Effect_name VARCHAR(50) PRIMARY KEY,
    Effect_type VARCHAR(50) NOT NULL,
    Phase VARCHAR(50) NOT NULL,
    HP_mod INT NOT NULL,
    MP_mod INT NOT NULL,
    EN_mod INT NOT NULL,
    STR_mod INT NOT NULL,
    DEX_mod INT NOT NULL,
    STM_mod INT NOT NULL,
    WIS_mod INT NOT NULL,
    RES_mod INT NOT NULL,
    LCK_mod INT NOT NULL,
    Duration INT NOT NULL,
    Op_dodge_mod INT NOT NULL,
    Op_attack_mod INT NOT NULL,
    Op_counter_mod INT NOT NULL,
    Self_dodge_mod INT NOT NULL
);

CREATE TABLE Class(
    Class_name VARCHAR(50) PRIMARY KEY,
    HP_mod INT NOT NULL,
    MP_mod INT NOT NULL,
    EN_mod INT NOT NULL,
    Atk_modifier CHAR(3) NOT NULL,
    STR_bonus INT NOT NULL,
    DEX_bonus INT NOT NULL,
    STM_bonus INT NOT NULL,
    WIS_bonus INT NOT NULL,
    RES_bonus INT NOT NULL,
    LCK_bonus INT NOT NULL
);

CREATE TABLE Class_abilities(
    classname VARCHAR(50) NOT NULL,
    Class_ability VARCHAR(50) NOT NULL,
    Phase VARCHAR(50) NOT NULL,
    Condition VARCHAR(50) NOT NULL,
    Effect VARCHAR(50) NOT NULL,
    Amplification INT NOT NULL,
    Multiplier INT NOT NULL,
    Level_req INT NOT NULL,
    STR_mod INT NOT NULL,
    DEX_mod INT NOT NULL,
    STM_mod INT NOT NULL,
    WIS_mod INT NOT NULL,
    RES_mod INT NOT NULL,
    LCK_mod INT NOT NULL,
    Duration INT NOT NULL,
    Cooldown INT NOT NULL,
    HP_cost INT NOT NULL,
    MP_cost INT NOT NULL,
    EN_cost INT NOT NULL,
    CONSTRAINT fk_class FOREIGN KEY(classname) REFERENCES Class(Class_name)
);
CREATE TABLE Chat_log(
    Chat_id SERIAL PRIMARY KEY,
    Message_body TEXT NOT NULL,
    send_time TIMESTAMP DEFAULT NOW(),
    Sender VARCHAR (50) NOT NULL
);

CREATE TABLE Battle(
    Battle_Id TEXT PRIMARY KEY,
    Participant_1 VARCHAR(50) NOT NULL,
    Participant_2 VARCHAR(50) DEFAULT '',
    Initiative_1 INT DEFAULT 0,
    Initiative_2 INT DEFAULT 0,
    Current_round INT DEFAULT 1,
    Participant_1_roll INT DEFAULT 0,
    Participant_2_response INT DEFAULT 0,
    Participant_2_roll INT DEFAULT 0,
    Participant_1_response INT DEFAULT 0,
    Participant_1_HP INT NOT NULL,
    Participant_1_MP INT NOT NULL,
    Participant_1_EN INT NOT NULL,
    Participant_1_STR INT NOT NULL,
    Participant_1_DEX INT NOT NULL,
    Participant_1_STM INT NOT NULL,
    Participant_1_WIS INT NOT NULL,
    Participant_1_RES INT NOT NULL,
    Participant_1_LCK INT NOT NULL,
    Participant_2_HP INT DEFAULT 0,
    Participant_2_MP INT DEFAULT 0,
    Participant_2_EN INT DEFAULT 0,
    Participant_2_STR INT DEFAULT 0,
    Participant_2_DEX INT DEFAULT 0,
    Participant_2_STM INT DEFAULT 0,
    Participant_2_WIS INT DEFAULT 0,
    Participant_2_RES INT DEFAULT 0,
    Participant_2_LCK INT DEFAULT 0,
    Battle_state VARCHAR (50) NOT NULL
    
);

CREATE TABLE Active_effects(
    Battle_Id TEXT NOT NULL,
    Effect_name VARCHAR (50) NOT NULL,
    Duration INT NOT NULL,
    Rounds_left INT NOT NULL,
    Applied_to VARCHAR (50) NOT NULL,
    CONSTRAINT fk_battle FOREIGN KEY (Battle_Id) REFERENCES Battle(Battle_Id)
);

CREATE TABLE Cooldown_abilities(
    Battle_Id TEXT NOT NULL,
    Ability VARCHAR(50) NOT NULL,
    Cooldown INT NOT NULL,
    Rounds_left INT NOT NULL,
    Applied_to VARCHAR (50) NOT NULL,
    CONSTRAINT fk_battle FOREIGN KEY (Battle_Id) REFERENCES Battle(Battle_Id)
);