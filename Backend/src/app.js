const express = require("express");
const cookieParser = require("cookie-parser")
const cors = require ("cors")

const app = express()

// Trust reverse proxy (essential for Render / Heroku / Vercel HTTPS cookies)
app.set("trust proxy", 1)

app.use(express.json())
app.use(cookieParser())

// Configure allowed CORS origins
const staticOrigins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://interview-ai-cyan-tau.vercel.app"
];

const envOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(u => u.trim().replace(/\/$/, "")).filter(Boolean)
    : [];

const allowedOrigins = [...new Set([...staticOrigins, ...envOrigins])];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const cleanOrigin = origin.replace(/\/$/, "");
        const isAllowed = allowedOrigins.includes(cleanOrigin) ||
            (process.env.NODE_ENV !== "production" && /^http:\/\/localhost(:\d+)?$/.test(cleanOrigin));

        if (isAllowed) {
            return callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            return callback(null, false);
        }
    },
    credentials: true
}))

// Health check endpoint for deployment probes (Render, Railway, etc.)
app.get("/", (req, res) => {
    res.status(200).json({ status: "ok", message: "Resume Checker API is running" });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
});

// require all the routes here
const authRouter = require("./routes/auth.routes")
const interviewRouter = require("./routes/interview.routes")

// using all the routes here
app.use("/api/auth", authRouter)
app.use("/api/interview", interviewRouter)

module.exports=app;