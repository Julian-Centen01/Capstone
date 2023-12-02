const express = require("express");
const app = express();
const cors = require("cors");

//middleware
app.use(cors());
app.use(express.json());

//register and login
app.use("/auth", require("./routes/auth"));

//dashboard route
app.use("/dashboard", require ("./routes/dashboard"));
//battle route
app.use("/battle" , require ("./routes/battle"));


app.listen(5000, () => {
    console.log("Server has started on port 5000");
});