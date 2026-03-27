const { getDashboardData } = require("../services/dashboardService");

exports.getDashboard = async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("User ID received:", userId);
        const data = await getDashboardData(userId);
        console.log("Data", data);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};