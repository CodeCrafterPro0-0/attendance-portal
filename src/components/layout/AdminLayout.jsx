import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import "./AdminLayout.css";

function AdminLayout() {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await signOut();
        navigate("/login", { replace: true });
    }

    return (
        <div className="admin-layout">
            <aside className="sidebar">
                <div className="sidebar-header">
                    <h2>Attendance</h2>
                    <p>Admin Panel</p>
                </div>

                <nav className="sidebar-nav">
                    <NavLink to="/admin">
                        Dashboard
                    </NavLink>

                    <NavLink to="/admin/members">
                        Members
                    </NavLink>

                    <NavLink to="/admin/attendance">
                        Attendance
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <div>
                        <strong>{profile?.full_name}</strong>
                        <small>Administrator</small>
                    </div>

                    <button onClick={handleLogout}>
                        Logout
                    </button>
                </div>
            </aside>

            <main className="admin-content">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;