import express from "express";
const router = express.Router();

router.get('/', (req, res) => {
  res.json(["Midtown", "Upper West Side", "Greenpoint", "Times Square", "Harlem", "Williamsburg", "Bushwick", "Long Island City"]);
});

export default router;