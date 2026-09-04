import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/auth/Login";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Attendance from "./pages/admin/Attendance";
import Members from "./pages/admin/Members";
import MemberDetails from "./pages/admin/MemberDetails";

import AdminLayout from "./components/layout/AdminLayout";

import { useAuth } from "./context/AuthContext";

function HomeRedirect() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profile) {
        return <p>Unable to load profile.</p>;
    }

    return <Navigate to="/admin" replace />;
}

function AdminRoute() {
    const { user, profile, loading } = useAuth();

    if (loading) {
        return <p>Loading...</p>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!profile) {
        return <p>Unable to load profile.</p>;
    }

    if (profile.role !== "admin") {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                {/* Dashboard redirect */}
                <Route
                    path="/dashboard"
                    element={<HomeRedirect />}
                />

                {/* Admin */}
                <Route element={<AdminRoute />}>
                    <Route element={<AdminLayout />}>
                        <Route
                            path="/admin"
                            element={<AdminDashboard />}
                        />

                        <Route
                            path="/admin/members"
                            element={<Members />}
                        />

                        <Route
                            path="/admin/members/:memberId"
                            element={<MemberDetails />}
                        />

                        <Route
                            path="/admin/attendance"
                            element={<Attendance />}
                        />
                    </Route>
                </Route>

                {/* Unknown route */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/dashboard"
                            replace
                        />
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;