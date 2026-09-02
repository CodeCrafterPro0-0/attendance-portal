import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function DashboardRedirect() {
    const { profile, loading } = useAuth();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!profile) {
        return <Navigate to="/login" replace />;
    }

    return (
        <Navigate
            to={profile.role === "admin" ? "/admin" : "/member"}
            replace
        />
    );
}

export default DashboardRedirect;