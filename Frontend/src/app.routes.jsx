import { createBrowserRouter, useRouteError, useNavigate } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";

function RouteError() {
    const error = useRouteError();
    const navigate = useNavigate();
    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0d1117",
            color: "#e6edf3",
            fontFamily: "system-ui, sans-serif",
            padding: "2rem",
            textAlign: "center"
        }}>
            <h1 style={{ fontSize: "2rem", color: "#ff2d78", marginBottom: "1rem" }}>Something went wrong</h1>
            <p style={{ color: "#7d8590", maxWidth: "500px", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
                {error?.message || "An unexpected error occurred while loading this page."}
            </p>
            <div style={{ display: "flex", gap: "1rem" }}>
                <button
                    onClick={() => window.location.reload()}
                    style={{
                        padding: "10px 20px",
                        background: "transparent",
                        border: "1px solid #ff2d78",
                        color: "#ff2d78",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    Reload Page
                </button>
                <button
                    onClick={() => navigate("/")}
                    style={{
                        padding: "10px 20px",
                        background: "#ff2d78",
                        border: "1px solid #ff2d78",
                        color: "#fff",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontWeight: "600"
                    }}
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
}

export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
        errorElement: <RouteError />
    },
    {
        path: "/register",
        element: <Register />,
        errorElement: <RouteError />
    },
    {
        path: "/",
        element: <Protected><Home /></Protected>,
        errorElement: <RouteError />
    },
    {
        path: "/interview/:interviewId",
        element: <Protected><Interview /></Protected>,
        errorElement: <RouteError />
    }
])
