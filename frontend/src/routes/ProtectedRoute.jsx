import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getSession } from "../models/authSession";
import { DASHBOARD_ROUTES } from "../models/roles";

export default function ProtectedRoute({ allowedRoles }) {
  const location = useLocation();
  const session = getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(session.user?.role)) {
    return <Navigate to={dashboardForRole(session.user?.role)} replace />;
  }

  return <Outlet />;
}

function dashboardForRole(role) {
  return DASHBOARD_ROUTES[role] || "/";
}
