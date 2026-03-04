import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchJson } from "@/utils/api";
import { Shield, Mail, Lock, User, ArrowLeft, LogOut } from "lucide-react";

const addFacultySchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

interface FacultyForm {
  email: string;
  password: string;
  fullName: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminPassword, setAdminPassword] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [facultyForm, setFacultyForm] = useState<FacultyForm>({
    email: "",
    password: "",
    fullName: "",
  });

  // Check if user is admin - redirect immediately if not
  useEffect(() => {
    if (!authLoading) {
      if (!profile || profile.role !== "admin") {
        toast.error("Unauthorized: Only admins can access this page");
        navigate("/");
      }
    }
  }, [profile, authLoading, navigate]);

  // Show loading while checking auth, or if not admin redirect in progress
  if (authLoading || !profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  if (profile.role !== "admin") {
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFacultyForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    try {
      const result = addFacultySchema.safeParse(facultyForm);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          fieldErrors[err.path[0]] = err.message;
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      if (!adminPassword) {
        setErrors({ adminPassword: "Admin password required" });
        setLoading(false);
        return;
      }

      const { res, data } = await fetchJson("/api/auth/admin/create-faculty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: facultyForm.email,
          password: facultyForm.password,
          full_name: facultyForm.fullName,
          admin_email: profile.email,
          admin_password: adminPassword,
        }),
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to create faculty account");
        setLoading(false);
        return;
      }

      toast.success(`Faculty account created: ${facultyForm.email}`);
      setFacultyForm({ email: "", password: "", fullName: "" });
      setAdminPassword("");
      setShowForm(false);
    } catch (error) {
      console.error("Add faculty error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>
          <button
            onClick={async () => {
              await logout();
              navigate("/auth");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-primary shadow-glow">
            <Shield className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gradient">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage faculty accounts</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <GlassCard className="p-6">
            <p className="text-muted-foreground text-sm">Logged in as</p>
            <p className="text-xl font-bold text-gradient">{profile.full_name}</p>
            <p className="text-xs text-muted-foreground mt-1">{profile.email}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-muted-foreground text-sm">Role</p>
            <p className="text-xl font-bold text-gradient capitalize">{profile.role}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-muted-foreground text-sm">Available Actions</p>
            <p className="text-xl font-bold text-gradient">Add Faculty</p>
          </GlassCard>
        </div>

        {/* Main Content */}
        {!showForm ? (
          <GlassCard className="p-8">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gradient opacity-50" />
              <h2 className="text-2xl font-bold mb-2">Add Faculty User</h2>
              <p className="text-muted-foreground mb-6">
                Create a new faculty account in the system. Faculty users can manage students, attendance, and marks.
              </p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-gradient-primary hover:bg-gradient-primary/90"
                size="lg"
              >
                Add New Faculty
              </Button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Create Faculty Account</h2>
              <p className="text-muted-foreground">
                Enter the faculty details and your admin password to confirm.
              </p>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-6">
              {/* Faculty Details Section */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Faculty Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="fullName" className="text-sm font-medium">
                      Full Name
                    </Label>
                    <div className="relative mt-1">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        value={facultyForm.fullName}
                        onChange={handleInputChange}
                        placeholder="Dr. John Doe"
                        className="pl-10 input-glow"
                      />
                    </div>
                    {errors.fullName && (
                      <p className="text-destructive text-xs mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </Label>
                    <div className="relative mt-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={facultyForm.email}
                        onChange={handleInputChange}
                        placeholder="faculty@example.com"
                        className="pl-10 input-glow"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="password" className="text-sm font-medium">
                      Temporary Password
                    </Label>
                    <div className="relative mt-1">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        value={facultyForm.password}
                        onChange={handleInputChange}
                        placeholder="Enter a temporary password"
                        className="pl-10 input-glow"
                      />
                    </div>
                    {errors.password && (
                      <p className="text-destructive text-xs mt-1">{errors.password}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin Verification Section */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4">Admin Verification</h3>
                <div>
                  <Label htmlFor="adminPassword" className="text-sm font-medium">
                    Your Admin Password (to confirm)
                  </Label>
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="adminPassword"
                      type="password"
                      value={adminPassword}
                      onChange={(e) => {
                        setAdminPassword(e.target.value);
                        setErrors((prev) => ({ ...prev, adminPassword: "" }));
                      }}
                      placeholder="Enter your admin password"
                      className="pl-10 input-glow"
                    />
                  </div>
                  {errors.adminPassword && (
                    <p className="text-destructive text-xs mt-1">{errors.adminPassword}</p>
                  )}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-gradient-primary hover:bg-gradient-primary/90"
                >
                  {loading ? "Creating..." : "Create Faculty Account"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setFacultyForm({ email: "", password: "", fullName: "" });
                    setAdminPassword("");
                    setErrors({});
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
