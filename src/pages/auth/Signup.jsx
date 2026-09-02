import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Signup.css";

function Signup() {
    const { user, signUp, loading } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
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
        setSuccess("");

        const trimmedEmail = email.trim().toLowerCase();

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSubmitting(true);

        const { error: signupError } = await signUp(
            trimmedEmail,
            password,
            ""
        );

        if (signupError) {
            console.error(signupError);

            const errorMessage = signupError.message.toLowerCase();

            if (
                errorMessage.includes("not been approved") ||
                errorMessage.includes("not approved") ||
                errorMessage.includes("database error saving new user")
            ) {
                setError(
                    "This email hasn't been approved yet. Please contact the administrator."
                );
            } else {
                setError(signupError.message);
            }

            setSubmitting(false);
            return;
        }

        setSuccess(
            "Account created successfully. Please check your email to confirm your account."
        );

        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setSubmitting(false);
    }

    return (
        <main className="signup-page">
            <div className="signup-card">
                <h1>Create your account</h1>

                <p className="signup-description">
                    Your email must be approved by the administrator.
                </p>

                <form onSubmit={handleSubmit}>
                    <label>
                        Email
                        <input
                            type="email"
                            value={email}
                            onChange={(e) =>
                                setEmail(e.target.value)
                            }
                            placeholder="Enter your email"
                            autoComplete="email"
                            disabled={submitting}
                        />
                    </label>

                    <label>
                        Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Create a password"
                            autoComplete="new-password"
                            disabled={submitting}
                        />
                    </label>

                    <label>
                        Confirm Password
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) =>
                                setConfirmPassword(e.target.value)
                            }
                            placeholder="Confirm your password"
                            autoComplete="new-password"
                            disabled={submitting}
                        />
                    </label>

                    {error && (
                        <div className="signup-error">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="signup-success">
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                    >
                        {submitting
                            ? "Creating account..."
                            : "Create Account"}
                    </button>
                </form>

                <p className="signup-login">
                    Already have an account?{" "}
                    <Link to="/login">Log in</Link>
                </p>
            </div>
        </main>
    );
}

export default Signup;