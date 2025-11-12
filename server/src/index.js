import express from "express";
import cors from "cors";
import timetableRoutes from "./routes/timetableRoutes.js"; //

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", timetableRoutes);

app.listen(4000, () =>
  console.log("✅ Server running on http://localhost:4000/api")
);
