module.exports = async (req , res , next) => {
    try {
        const token = req.header("token");
        const battletoken = req.header("battletoken");

        if (!token || !battletoken)
            return res.status(403).json("Not Authorized");

        next();

    } catch (err) {
        console.error(err.message);
        return res.status(403).json("Not Authorized");
    }
}