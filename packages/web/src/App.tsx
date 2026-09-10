import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAdmin } from "./auth/RequireAdmin";
import { AuthCallback } from "./pages/AuthCallback";
import { CreateExercise } from "./pages/CreateExercise";
import { Dashboard } from "./pages/Dashboard";
import { Exercises } from "./pages/Exercises";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import "./components/landing/landing.css";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/callback" element={<AuthCallback />} />
          <Route
            path="/dashboard"
            element={
              <RequireAdmin>
                <Dashboard />
              </RequireAdmin>
            }
          />
          <Route
            path="/exercises"
            element={
              <RequireAdmin>
                <Exercises />
              </RequireAdmin>
            }
          />
          <Route
            path="/exercises/new"
            element={
              <RequireAdmin>
                <CreateExercise />
              </RequireAdmin>
            }
          />
          <Route
            path="/exercises/:id/edit"
            element={
              <RequireAdmin>
                <CreateExercise />
              </RequireAdmin>
            }
          />
        </Routes>
        <ToastContainer
          position="bottom-right"
          autoClose={4000}
          hideProgressBar
          newestOnTop
          closeOnClick
          pauseOnHover
          icon={false}
          theme="light"
          toastClassName="sm-toast"
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
