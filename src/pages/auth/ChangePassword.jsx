import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import "./ChangePassword.css";

function ChangePassword() {
    const { user, profile, loading } = useAuth();
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profile?.must_change_password) {
        return <Navigate to="/dashboard" replace />;
    }

    async function handleSubmit(e) {
        e.preventDefault();

        setError("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setSaving(true);

        const { error: passwordError } =
            await supabase.auth.updateUser({
                password,
            });

        if (passwordError) {
            console.error(passwordError);
            setError(passwordError.message);
            setSaving(false);
            return;
        }

        const { error: profileError } = await supabase
            .from("profiles")
            .update({
                must_change_password: false,
            })
            .eq("id", user.id);

        if (profileError) {
            console.error(profileError);
            setError(
                "Password changed, but we couldn't finish setting up your account. Please try again."
            );
            setSaving(false);
            return;
        }

        navigate("/dashboard", { replace: true });
    }

    return (
        <main className="change-password-page">
            <div className="change-password-card">
                <h1>Welcome 👋</h1>

                <p className="change-password-description">
                    You're using a temporary password. Please create
                    a new password before continuing.
                </p>

                <form onSubmit={handleSubmit}>
                    <label>
                        New Password
                        <input
                            type="password"
                            value={password}
                            onChange={(e) =>
                                setPassword(e.target.value)
                            }
                            placeholder="Enter new password"
                            autoComplete="new-password"
                            disabled={saving}
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
                            placeholder="Confirm new password"
                            autoComplete="new-password"
                            disabled={saving}
                        />
                    </label>

                    {error && (
                        <div className="change-password-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={saving}
                    >
                        {saving
                            ? "Updating..."
                            : "Update Password"}
                    </button>
                </form>
            </div>
        </main>
    );
}

export default ChangePassword;