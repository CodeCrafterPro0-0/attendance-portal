import { useState } from "react";
import { Navigate, Link} from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import "./Login.css";

function Login() {
    const { user, signIn, loading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");
        setSubmitting(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError(error.message);
            setSubmitting(false);
            return;
        }
    }

    return (
        <main className="login-page">
            <div className="login-card">
                <h1>Attendance Portal</h1>
                <h2>Login</h2>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="login-field">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="login-field">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        className="login-button"
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting ? "Logging in..." : "Login"}
                    </button>

                    <p className="login-signup">
                        Don't have an account?{" "}
                        <Link to="/signup">Sign up</Link>
                    </p>
                </form>
            </div>
        </main>
    );
}

export default Login;