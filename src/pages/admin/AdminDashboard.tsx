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
import { Shield, Mail, Lock, User, ArrowLeft, LogOut, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const addFacultySchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
});

interface FacultyForm {
  email: string;
  password: string;
  fullName: string;
  assignedSubjects: string[];
}

interface Subject {
  _id: string;
  code: string;
  name: string;
  semester: number;
  branch_code: string;
}

interface Faculty {
  _id: string;
  email: string;
  full_name: string;
  assigned_subjects: string[];
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { profile, loading: authLoading, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminPassword, setAdminPassword] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [factsLoading, setFactsLoading] = useState(false);

  const [facultyForm, setFacultyForm] = useState<FacultyForm>({
    email: "",
    password: "",
    fullName: "",
    assignedSubjects: [],
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

  // Load subjects and faculty
  useEffect(() => {
    const loadData = async () => {
      setFactsLoading(true);
      try {
        const [subjectsRes, facultyRes] = await Promise.all([
          fetchJson("/api/subjects"),
          fetchJson("/api/profiles/faculty/list"),
        ]);

        if (subjectsRes.res.ok) {
          setSubjects(subjectsRes.data);
        }

        if (facultyRes.res.ok) {
          setFaculty(facultyRes.data);
        }
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setFactsLoading(false);
      }
    };

    if (profile?.role === "admin") {
      loadData();
    }
  }, [profile]);

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

  const handleSubjectToggle = (subjectId: string) => {
    setFacultyForm((prev) => ({
      ...prev,
      assignedSubjects: prev.assignedSubjects.includes(subjectId)
        ? prev.assignedSubjects.filter((id) => id !== subjectId)
        : [...prev.assignedSubjects, subjectId],
    }));
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
          assigned_subjects: facultyForm.assignedSubjects,
        }),
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to create faculty account");
        setLoading(false);
        return;
      }

      toast.success(`Faculty account created: ${facultyForm.email}`);
      setFacultyForm({ email: "", password: "", fullName: "", assignedSubjects: [] });
      setAdminPassword("");
      setShowForm(false);

      // Reload faculty list
      const { res: refRes, data: refData } = await fetchJson("/api/profiles/faculty/list");
      if (refRes.ok) {
        setFaculty(refData);
      }
    } catch (error) {
      console.error("Add faculty error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find((s) => s._id === subjectId);
    return subject ? `${subject.code} - ${subject.name}` : subjectId;
  };

  return (
    <div className="min-h-screen mesh-gradient p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
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

      <div className="max-w-6xl mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
            <p className="text-muted-foreground text-sm">Total Faculty</p>
            <p className="text-xl font-bold text-gradient">{faculty.length}</p>
          </GlassCard>

          <GlassCard className="p-6">
            <p className="text-muted-foreground text-sm">Available Subjects</p>
            <p className="text-xl font-bold text-gradient">{subjects.length}</p>
          </GlassCard>
        </div>

        {/* Main Content - Add Faculty Form */}
        {!showForm ? (
          <GlassCard className="p-8 mb-8">
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
          <GlassCard className="p-8 mb-8">
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

              {/* Assigned Subjects Section */}
              <div className="pt-6 border-t border-border">
                <h3 className="text-lg font-semibold mb-4">Assign Subjects</h3>
                {subjects.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subjects.map((subject) => (
                      <div
                        key={subject._id}
                        className="flex items-center p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition"
                        onClick={() => handleSubjectToggle(subject._id)}
                      >
                        <input
                          type="checkbox"
                          checked={facultyForm.assignedSubjects.includes(subject._id)}
                          onChange={() => handleSubjectToggle(subject._id)}
                          className="rounded border-border"
                        />
                        <label className="ml-3 flex-1 cursor-pointer">
                          <p className="font-medium text-sm">{subject.code}</p>
                          <p className="text-xs text-muted-foreground">{subject.name}</p>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No subjects available</p>
                )}
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
                    setFacultyForm({ email: "", password: "", fullName: "", assignedSubjects: [] });
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

        {/* Faculty List */}
        <GlassCard className="p-8">
          <h2 className="text-2xl font-bold mb-6">Faculty Members</h2>

          {factsLoading ? (
            <div className="flex justify-center py-8">
              <Loader size="md" text="Loading faculty..." />
            </div>
          ) : faculty.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Assigned Subjects</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty.map((fac) => (
                    <TableRow key={fac._id}>
                      <TableCell className="font-mono text-sm">{fac.email}</TableCell>
                      <TableCell>{fac.full_name}</TableCell>
                      <TableCell>
                        {fac.assigned_subjects && fac.assigned_subjects.length > 0 ? (
                          <div className="space-y-1">
                            {fac.assigned_subjects.map((subId) => (
                              <p key={subId} className="text-xs bg-accent/50 px-2 py-1 rounded w-fit">
                                {getSubjectName(subId)}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">No subjects assigned</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No faculty members yet</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;

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
