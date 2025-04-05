import express from "express";
// import { client } from "./config/db.config.js";
import ApiResponse from "./utils/ApiResponse.utils.js";
import { ErrorHandler } from "./middlewares/error.middleware.js";
import { auth } from "./middlewares/auth.middleware.js";
import { query } from "./config/db.config.js";

// routes imports
import couponRouter from "./routes/coupons.routes.js";
import couponV2Router from "./routes/coupons_v2.routes.js";

const app = express();


app.use(express.json());

// API Route
app.get('/v1/ping', async (req, res) => {
    return res.status(200).json(new ApiResponse(200, "Ping API", []));
});

// API DB PING route

app.get('/v1/ping/db', async (req, res) => {
    try {
        const result = await query('SELECT $1::text as message', ['Hello world!']);
        return res.status(200).json(new ApiResponse(200, "Ping API", result.rows));
    } catch (error) {
        return res.status(500).json(new ApiResponse(500, "Database error", error.message));
    }
});


app.use('/v1/coupon',auth, couponRouter);
app.use('/v2/coupon',auth, couponV2Router);

app.use(ErrorHandler);





app.listen(7000, () => {
    console.log(`🚀 Server running at http://localhost:7000`);
});



// // Connect to PostgreSQL
// client.connect()
//     .then(() => {
//         console.log("Connected to PostgreSQL ✅");

//         app.listen(3000, () => {
//             console.log(`🚀 Server running at http://localhost:3000`);
//         });
//     })
//     .catch(err => {
//         console.error("❌ Database connection error:", err);
//         process.exit(1);
//     });
