import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Faculty Pages
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import FacultyStudents from "./pages/faculty/FacultyStudents";
import FacultyAttendance from "./pages/faculty/FacultyAttendance";
import FacultyMarks from "./pages/faculty/FacultyMarks";

// Student Pages
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentAttendance from "./pages/student/StudentAttendance";
import StudentMarks from "./pages/student/StudentMarks";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            {/* Faculty Routes */}
            <Route path="/faculty" element={<FacultyDashboard />} />
            <Route path="/faculty/students" element={<FacultyStudents />} />
            <Route path="/faculty/attendance" element={<FacultyAttendance />} />
            <Route path="/faculty/marks" element={<FacultyMarks />} />

            {/* Student Routes */}
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/attendance" element={<StudentAttendance />} />
            <Route path="/student/marks" element={<StudentMarks />} />

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
