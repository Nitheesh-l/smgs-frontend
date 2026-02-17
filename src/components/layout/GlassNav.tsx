import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  LogOut,
  Menu,
  X,
  Users,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

interface GlassNavProps {
  role: "faculty" | "student";
  userName?: string;
}

const GlassNav = ({ role, userName }: GlassNavProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const facultyNavItems: NavItem[] = [
    { label: "Dashboard", href: "/faculty", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Students", href: "/faculty/students", icon: <Users className="w-4 h-4" /> },
    { label: "Attendance", href: "/faculty/attendance", icon: <Calendar className="w-4 h-4" /> },
    { label: "Marks", href: "/faculty/marks", icon: <ClipboardList className="w-4 h-4" /> },
  ];

  const studentNavItems: NavItem[] = [
    { label: "Dashboard", href: "/student", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "Attendance", href: "/student/attendance", icon: <Calendar className="w-4 h-4" /> },
    { label: "Marks", href: "/student/marks", icon: <BookOpen className="w-4 h-4" /> },
  ];

  const navItems = role === "faculty" ? facultyNavItems : studentNavItems;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  return (
    <nav className="fixed top-4 left-4 right-4 z-50">
      <div className="glass-nav rounded-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to={role === "faculty" ? "/faculty" : "/student"} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg hidden sm:block">
              {role === "faculty" ? "Faculty Portal" : "Student Portal"}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                  location.pathname === item.href
                    ? "bg-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Info & Logout */}
          <div className="hidden md:flex items-center gap-4">
            {userName && (
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-semibold text-foreground">{userName}</span>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-muted transition-colors"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-border">
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    location.pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  {item.icon}
                  {item.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors mt-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default GlassNav;
