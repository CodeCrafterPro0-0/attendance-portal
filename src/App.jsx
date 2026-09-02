import {
    BrowserRouter,
    Navigate,
    Outlet,
    Route,
    Routes,
} from "react-router-dom";

import Login from "./pages/auth/Login";
import ChangePassword from "./pages/auth/ChangePassword";

import AdminDashboard from "./pages/admin/AdminDashboard";
import MemberDashboard from "./pages/member/MemberDashboard";
import AdminLayout from "./components/layout/AdminLayout";

import Attendance from "./pages/admin/Attendance";
import Members from "./pages/admin/Members";

import { useAuth } from "./context/AuthContext";
import Signup from "./pages/auth/Signup";

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
    if (profile.must_change_password) {
      return <Navigate to="/change-password" replace />;
  }

  return (
      <Navigate
          to={profile.role === "admin" ? "/admin" : "/member"}
          replace
      />
  );
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
        return <Navigate to="/member" replace />;
    }

    return <Outlet />;
}

function MemberRoute() {
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

    if (profile.role !== "member") {
        return <Navigate to="/admin" replace />;
    }

    return <MemberDashboard />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                <Route
                    path="/change-password"
                    element={<ChangePassword />}
                />

                {/* Dashboard redirect */}
                <Route path="/dashboard" element={<HomeRedirect />} />

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
                            path="/admin/attendance"
                            element={<Attendance />}
                        />
                       
                    </Route>
                </Route>

                {/* Member */}
                <Route
                    path="/member"
                    element={<MemberRoute />}
                />

                {/* Unknown route */}
                <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;