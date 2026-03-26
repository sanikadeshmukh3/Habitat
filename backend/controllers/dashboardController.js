const { getDashboardData } = require("../services/dashboardService");

exports.getDashboard = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await getDashboardData(userId);
        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};