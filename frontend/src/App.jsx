import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import AuthLanding from "./pages/AuthLanding";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import VerifyEmail from "./pages/VerifyEmail";
import AdminHome from "./pages/AdminHome";
import StudentHome from "./pages/StudentHome";
import TeacherHome from "./pages/TeacherHome"
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ProtectedRoute from "./routes/ProtectedRoute";
import { ROLES } from "./models/roles";


const router = createBrowserRouter([
  { 
    path: "/",
    element: <AuthLanding />
  },
  { 
    path: "/login",
    element: <Login />
  },
  {
    path: "/login/student",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/login/teacher",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/login/admin",
    element: <Navigate to="/login" replace />
  },
  {
    path: "/signup",
    element: <SignUp />
  },
  {
    path: "/verify-email/:token",
    element: <VerifyEmail />
  },
  {
    path: "/forgot-password",
    element: <ForgotPassword />
  },
  {
    path: "/reset-password/:token",
    element: <ResetPassword />
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.ADMIN]} />,
    children: [{ path: "/adminhome", element: <AdminHome /> }],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.STUDENT]} />,
    children: [{ path: "/studenthome", element: <StudentHome /> }],
  },
  {
    element: <ProtectedRoute allowedRoles={[ROLES.PROFESSOR]} />,
    children: [{ path: "/teacherhome", element: <TeacherHome /> }],
  },
]);

function App() {
  return <RouterProvider router={router} />;
}

export default App;