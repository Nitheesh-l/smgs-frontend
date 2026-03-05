import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { GraduationCap, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchJson } from "@/utils/api";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

type UserType = "faculty" | "student";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, signUp, user, profile, loading: authLoading } = useAuth();

  const [isLogin] = useState(true); // Always login mode
  const [userType, setUserType] = useState<UserType>("student");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasRedirected, setHasRedirected] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    rollNumber: "",
  });

  // Set user type from URL params
  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "faculty" || type === "student") {
      setUserType(type);
    }
  }, [searchParams]);

  // Redirect after successful login based on role
  useEffect(() => {
    console.log("Redirect check:", { user: !!user, profile: !!profile, authLoading, hasRedirected, role: profile?.role });
    
    if (hasRedirected) {
      return;
    }
    
    if (user && profile && !authLoading) {

      setHasRedirected(true);
      
      if (profile.role === "faculty") {
        
        navigate("/faculty");
      } else if (profile.role === "student") {
        navigate("/student");
      } else if (profile.role === "admin") {
        
        navigate("/admin");
      }
    }
  }, [user, profile, authLoading, hasRedirected, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      // For student login with roll number
      if (userType === "student" && formData.rollNumber) {
        if (!formData.rollNumber || !formData.password) {
          setErrors({
            rollNumber: formData.rollNumber ? "" : "Roll number required",
            password: formData.password ? "" : "Password required",
          });
          setLoading(false);
          return;
        }

        const { error } = await signIn(
          formData.email,
          formData.password,
          userType,
          formData.rollNumber
        );
        if (error) {
          toast.error(error.message || "Invalid credentials");
          setLoading(false);
          return;
        }

        toast.success("Login successful!");
        return;
      }

      // For faculty login with email
      const result = loginSchema.safeParse(formData);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      const { error } = await signIn(formData.email, formData.password, userType);
      if (error) {
        toast.error(error.message || "Invalid credentials");
        setLoading(false);
        return;
      }

      toast.success("Login successful!");
    } catch (error) {
      console.error("Auth submit error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary shadow-glow mb-4">
            <GraduationCap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-gradient">
            Student Management System
          </h1>
          <p className="text-muted-foreground mt-2">
            {userType === "faculty" ? "Faculty Portal" : "Student Portal"}
          </p>
        </div>

        <GlassCard className="p-8">
          {/* User Type Selector */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-xl">
            <button
              type="button"
              onClick={() => {
                setUserType("student");
                setErrors({});
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                userType === "student"
                  ? "bg-card shadow-md text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Student
            </button>
            <button
              type="button"
              onClick={() => {
                setUserType("faculty");
                setErrors({});
              }}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                userType === "faculty"
                  ? "bg-card shadow-md text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Faculty
            </button>
          </div>

          {/* Faculty can only login, not signup */}
          {userType === "faculty" && (
            <div className="mb-6 p-3 bg-blue/10 rounded-lg border border-blue/20">
              <p className="text-sm text-foreground">
                <strong>Faculty:</strong> Only administrators can create faculty accounts. Contact your admin to register.
              </p>
            </div>
          )}

          {/* Info message for students */}
          {userType === "student" && (
            <div className="mb-6 p-3 bg-primary/10 rounded-lg border border-primary/20">
              <p className="text-sm text-foreground">
                <strong>Students:</strong> Your login credentials have been created by faculty. Use your roll number and the password provided.
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {userType === "student" || userType === "faculty" ? (
              <div>
                <Label htmlFor="rollNumber" className="text-sm font-medium">
                  {userType === "student" ? "Roll Number" : "Email"}
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id={userType === "student" ? "rollNumber" : "email"}
                    name={userType === "student" ? "rollNumber" : "email"}
                    type={userType === "student" ? "text" : "email"}
                    value={userType === "student" ? formData.rollNumber : formData.email}
                    onChange={handleInputChange}
                    placeholder={userType === "student" ? "Enter your roll number" : "Enter your email"}
                    className="pl-10 input-glow"
                  />
                </div>
                {errors.rollNumber && (
                  <p className="text-destructive text-xs mt-1">{errors.rollNumber}</p>
                )}
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email}</p>
                )}
              </div>
            ) : (
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    className="pl-10 input-glow"
                  />
                </div>
                {errors.email && (
                  <p className="text-destructive text-xs mt-1">{errors.email}</p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Password
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password"
                  className="pl-10 pr-10 input-glow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-destructive text-xs mt-1">{errors.password}</p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full btn-gradient py-6 rounded-xl"
            >
              {loading ? <Loader size="sm" /> : "Sign In"}
            </Button>
          </form>

          {/* Info for students */}
          {userType === "student" && (
            <div className="mt-6 text-center">
              <p className="text-xs text-muted-foreground">
                Note: Student accounts are created by faculty. Contact your faculty if you don't have an account.
              </p>
            </div>
          )}
        </GlassCard>

        {/* Back to home */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
