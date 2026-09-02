import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Dashboard() {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await signOut();
        navigate("/login", { replace: true });
    }

    return (
        <main>
            <h1>Dashboard</h1>

            <p>Welcome, {profile?.full_name}</p>
            <p>Role: {profile?.role}</p>

            <button onClick={handleLogout}>
                Logout
            </button>
        </main>
    );
}

export default Dashboard;