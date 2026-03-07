import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { fetchJson } from "@/utils/api";
import { Shield, Mail, Lock, User, LogOut, Trash2, Edit, Plus, MessageSquare, ExternalLink } from "lucide-react";
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

// Schema for editing - password is optional
const editFacultySchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().optional(),
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
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [factsLoading, setFactsLoading] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedSemester, setSelectedSemester] = useState<number>(1);

  // Links/Updates state - now integrated into notifications
  const [links, setLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    url: "",
    file_url: "",
    file_name: "",
  });

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    content: "",
    type: "announcement",
    target_year: "0",
    url: "",
  });

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
  const loadData = async () => {
    setFactsLoading(true);
    try {
      const [subjectsRes, facultyRes, linksRes, notificationsRes] = await Promise.all([
        fetchJson("/api/subjects"),
        fetchJson("/api/profiles/faculty/list"),
        fetchJson("/api/links"),
        fetchJson("/api/notifications"),
      ]);

      if (subjectsRes.res.ok) {
        setAllSubjects(subjectsRes.data);
        // Filter subjects by selected semester
        const filteredSubjects = subjectsRes.data.filter((subject: Subject) => 
          subject.semester === selectedSemester
        );
        setSubjects(filteredSubjects);
      }

      if (facultyRes.res.ok) {
        setFaculty(facultyRes.data);
      }

      if (linksRes.res.ok) {
        setLinks(linksRes.data);
      }

      if (notificationsRes.res.ok) {
        setNotifications(notificationsRes.data);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setFactsLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "admin") {
      loadData();
    }
  }, [profile, selectedSemester]);

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
      // Use different schema based on edit vs create
      const schema = editingFaculty ? editFacultySchema : addFacultySchema;
      const result = schema.safeParse(facultyForm);
      if (!result.success) {
        const fieldErrors: Record<string, string> = {};
        result.error.errors.forEach((err) => {
          fieldErrors[err.path[0] as string] = err.message;
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

      if (editingFaculty) {
        // Update faculty details
        const { res: updateRes, data: updateData } = await fetchJson(`/api/profiles/${editingFaculty._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            full_name: facultyForm.fullName,
            assigned_subjects: facultyForm.assignedSubjects,
          }),
        });

        if (!updateRes.ok) {
          toast.error(updateData?.error || "Failed to update faculty");
          setLoading(false);
          return;
        }

        toast.success("Faculty updated successfully");
        setFacultyForm({ email: "", password: "", fullName: "", assignedSubjects: [] });
        setAdminPassword("");
        setShowForm(false);
        setEditingFaculty(null);

        // Reload faculty list
        const { res: refRes, data: refData } = await fetchJson("/api/profiles/faculty/list");
        if (refRes.ok) {
          setFaculty(refData);
        }
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
      setEditingFaculty(null);

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
    const subject = allSubjects.find((s) => s._id === subjectId);
    return subject ? `${subject.code} - ${subject.name}` : subjectId;
  };

  const handleEditFaculty = (fac: Faculty) => {
    setEditingFaculty(fac);
    setFacultyForm({
      email: fac.email,
      password: "",
      fullName: fac.full_name,
      assignedSubjects: fac.assigned_subjects || [],
    });
    setShowForm(true);
  };

  const handleDeleteFaculty = async (facId: string) => {
    if (!window.confirm("Are you sure you want to delete this faculty member?")) return;
    
    setDeleting(facId);
    try {
      const { res, data } = await fetchJson(`/api/profiles/${facId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete faculty");
        setDeleting(null);
        return;
      }

      toast.success("Faculty member deleted successfully");
      setFaculty(faculty.filter((f) => f._id !== facId));
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete faculty member");
    } finally {
      setDeleting(null);
    }
  };

  // Links/Updates handlers
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    setLinkLoading(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...linkForm,
          created_by: profile?.full_name,
          created_by_role: 'admin'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to add link");
        return;
      }

      toast.success("Link/Update added successfully");
      setLinks(prev => [data.link, ...prev]);
      setLinkForm({ title: "", description: "", url: "", file_url: "", file_name: "" });
      setShowLinkForm(false);
    } catch (error) {
      console.error("Add link error:", error);
      toast.error("Failed to add link");
    } finally {
      setLinkLoading(false);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link/update?")) return;

    try {
      const res = await fetch(`/api/links/${linkId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to delete link");
        return;
      }

      toast.success("Link/Update deleted successfully");
      setLinks(prev => prev.filter(link => link._id !== linkId));
    } catch (error) {
      console.error("Delete link error:", error);
      toast.error("Failed to delete link");
    }
  };

  // Notifications handlers
  const handleAddNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    setNotificationLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notificationForm,
          created_by: profile?.full_name,
          created_by_role: 'admin'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to add notification");
        return;
      }

      toast.success("Notification added successfully");
      setNotifications(prev => [data.notification, ...prev]);
      setNotificationForm({ title: "", content: "", target_year: "0", type: "announcement", url: "" });
      setShowNotificationForm(false);
    } catch (error) {
      console.error("Add notification error:", error);
      toast.error("Failed to add notification");
    } finally {
      setNotificationLoading(false);
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to delete notification");
        return;
      }

      toast.success("Notification deleted successfully");
      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
    } catch (error) {
      console.error("Delete notification error:", error);
      toast.error("Failed to delete notification");
    }
  };

  return (
    <div className="min-h-screen mesh-gradient p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4 flex-1">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 shadow-glow">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
            </div>
          </div>

          {/* Stats and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <GlassCard className="p-4 bg-blue-50 border border-blue-200 min-w-[140px] w-full sm:w-auto">
              <p className="text-muted-foreground text-xs sm:text-sm">Total Faculty</p>
              <p className="text-lg sm:text-xl font-bold text-blue-700">{faculty.length}</p>
            </GlassCard>
            <button
              onClick={async () => {
                await logout();
                navigate("/auth");
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-destructive hover:bg-destructive/10 transition w-full sm:w-auto"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">

        {/* Main Content - Add Faculty Form */}
        {!showForm ? (
          <GlassCard className="p-8 mb-8">
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto mb-4 text-blue-600 opacity-70" />
              <h2 className="text-2xl font-bold mb-2">Add Faculty User</h2>
              <p className="text-muted-foreground mb-6">
                Create a new faculty account in the system. Faculty users can manage students, attendance, and marks.
              </p>
              <Button
                onClick={() => {
                  setEditingFaculty(null);
                  setFacultyForm({ email: "", password: "", fullName: "", assignedSubjects: [] });
                  setShowForm(true);
                }}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Add New Faculty
              </Button>
            </div>
          </GlassCard>
        ) : (
          <GlassCard className="p-8 mb-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">{editingFaculty ? "Edit Faculty Account" : "Create Faculty Account"}</h2>
              <p className="text-muted-foreground">
                {editingFaculty 
                  ? "Update the faculty details and your admin password to confirm." 
                  : "Enter the faculty details and your admin password to confirm."}
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
                        disabled={!!editingFaculty}
                        className="pl-10 input-glow"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-destructive text-xs mt-1">{errors.email}</p>
                    )}
                  </div>

                  {!editingFaculty && (
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
                  )}
                </div>
              </div>

              {/* Assigned Subjects Section */}
              <div className="pt-6 border-t border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Assign Subjects</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Label className="text-sm font-medium whitespace-nowrap">Year:</Label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          const newYear = Number(e.target.value);
                          setSelectedYear(newYear);
                          // Auto-select first semester of the year
                          setSelectedSemester((newYear - 1) * 2 + 1);
                        }}
                        className="px-3 py-1 border border-border rounded-md text-sm bg-background flex-1 sm:flex-initial"
                      >
                        <option value={1}>Year 1</option>
                        <option value={2}>Year 2</option>
                        <option value={3}>Year 3</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Label className="text-sm font-medium whitespace-nowrap">Semester:</Label>
                      <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(Number(e.target.value))}
                        className="px-3 py-1 border border-border rounded-md text-sm bg-background flex-1 sm:flex-initial"
                      >
                        <option value={1}>Semester 1</option>
                        <option value={2}>Semester 2</option>
                        <option value={3}>Semester 3</option>
                        <option value={4}>Semester 4</option>
                        <option value={5}>Semester 5</option>
                        <option value={6}>Semester 6</option>
                      </select>
                    </div>
                  </div>
                </div>
                {subjects.length > 0 || facultyForm.assignedSubjects.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Show assigned subjects from other semesters first */}
                    {allSubjects
                      .filter(subject => 
                        facultyForm.assignedSubjects.includes(subject._id) && 
                        subject.semester !== selectedSemester
                      )
                      .map((subject) => (
                        <div
                          key={subject._id}
                          className="flex items-center p-3 rounded-lg border border-orange-200 bg-orange-50 cursor-pointer transition"
                          onClick={() => handleSubjectToggle(subject._id)}
                        >
                          <input
                            type="checkbox"
                            checked={facultyForm.assignedSubjects.includes(subject._id)}
                            onChange={() => handleSubjectToggle(subject._id)}
                            className="rounded border-border mr-3"
                          />
                          <label className="flex-1 cursor-pointer">
                            <p className="font-medium text-sm">{subject.code}</p>
                            <p className="text-xs text-orange-600">{subject.name} (Sem {subject.semester}) - Different Semester</p>
                          </label>
                        </div>
                      ))}
                    {/* Show subjects for current year */}
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
                          className="rounded border-border mr-3"
                        />
                        <label className="flex-1 cursor-pointer">
                          <p className="font-medium text-sm">{subject.code}</p>
                          <p className="text-xs text-muted-foreground">{subject.name} (Sem {subject.semester})</p>
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">No subjects available for Semester {selectedSemester}</p>
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
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (editingFaculty ? "Updating..." : "Creating...") : (editingFaculty ? "Update Faculty" : "Create Faculty Account")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingFaculty(null);
                    setFacultyForm({ email: "", password: "", fullName: "", assignedSubjects: [] });
                    setAdminPassword("");
                    setErrors({});
                  }}
                  disabled={loading}
                  className="sm:flex-initial"
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
            <div className="space-y-4">
              {/* Mobile Card Layout */}
              <div className="block md:hidden space-y-4">
                {faculty.map((fac) => (
                  <GlassCard key={fac._id} className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="font-semibold text-lg">{fac.full_name}</h3>
                        <p className="text-sm text-muted-foreground font-mono">{fac.email}</p>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium mb-2">Assigned Subjects:</p>
                        {fac.assigned_subjects && fac.assigned_subjects.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {fac.assigned_subjects.map((subId) => (
                              <span key={subId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                {getSubjectName(subId)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No subjects assigned</span>
                        )}
                      </div>
                      
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditFaculty(fac)}
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteFaculty(fac._id)}
                          disabled={deleting === fac._id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 flex-1"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
              
              {/* Desktop Table Layout */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Assigned Subjects</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
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
                                <p key={subId} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded w-fit">
                                  {getSubjectName(subId)}
                                </p>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">No subjects assigned</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditFaculty(fac)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteFaculty(fac._id)}
                              disabled={deleting === fac._id}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No faculty members yet</p>
          )}
        </GlassCard>

        {/* Links/Updates Management Section */}
        <GlassCard className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Links & Resources</h2>
              <p className="text-muted-foreground text-sm">Share PDFs, resources, and important updates with faculty and students</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>

          {/* Add Link/Update Form */}
          {showLinkForm && (
            <GlassCard className="p-4 mb-6 border-green-200 bg-green-50/50">
              <h3 className="text-lg font-semibold mb-4">Add New Link/Resource</h3>
              <form onSubmit={handleAddLink} className="space-y-4">
                <div>
                  <Label htmlFor="linkTitle" className="text-sm font-medium">
                    Title
                  </Label>
                  <Input
                    id="linkTitle"
                    value={linkForm.title}
                    onChange={(e) => setLinkForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter title for the link/update"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="linkDescription" className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    id="linkDescription"
                    value={linkForm.description}
                    onChange={(e) => setLinkForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description or content"
                    className="mt-1"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="linkUrl" className="text-sm font-medium">
                    URL (optional)
                  </Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    value={linkForm.url}
                    onChange={(e) => setLinkForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com or leave empty for content-only update"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={linkLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {linkLoading ? "Adding..." : "Add Link/Update"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowLinkForm(false);
                      setLinkForm({ title: "", description: "", url: "", file_url: "", file_name: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Links/Updates List */}
          {linksLoading ? (
            <div className="flex justify-center py-8">
              <Loader size="md" text="Loading links..." />
            </div>
          ) : links.length > 0 ? (
            <div className="space-y-4">
              {links.map((link) => (
                <div key={link._id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <h4 className="font-semibold mb-1">{link.title}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{link.description}</p>
                      {link.url && (
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Link
                        </a>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-muted-foreground">
                          Posted on {new Date(link.created_at).toLocaleDateString()}
                          {link.created_by && ` by ${link.created_by}`}
                        </p>
                        {link.created_by_role && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            {link.created_by_role === 'faculty' ? 'Faculty' : 'Admin'}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteLink(link._id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No links or updates yet</p>
          )}
        </GlassCard>

        {/* Notifications, Assignments & Links Management Section */}
        <GlassCard className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Notifications, Assignments & Links</h2>
              <p className="text-muted-foreground text-sm">Post announcements, assignments, and links for students</p>
            </div>
            <Button
              onClick={() => setShowNotificationForm(!showNotificationForm)}
              className="bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Notification
            </Button>
          </div>

          {/* Add Notification Form */}
          {showNotificationForm && (
            <GlassCard className="p-4 mb-6 border-purple-200 bg-purple-50/50">
              <h3 className="text-lg font-semibold mb-4">Add New Notification</h3>
              <form onSubmit={handleAddNotification} className="space-y-4">
                <div>
                  <Label htmlFor="notificationTitle" className="text-sm font-medium">
                    Title
                  </Label>
                  <Input
                    id="notificationTitle"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter notification title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notificationContent" className="text-sm font-medium">
                    Content
                  </Label>
                  <Textarea
                    id="notificationContent"
                    value={notificationForm.content}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter notification content or assignment details"
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Students</Label>
                  <Select
                    value={notificationForm.target_year}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, target_year: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Years</SelectItem>
                      <SelectItem value="1">Year 1 Only</SelectItem>
                      <SelectItem value="2">Year 2 Only</SelectItem>
                      <SelectItem value="3">Year 3 Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Select
                    value={notificationForm.type}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="link">Link/Resource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {notificationForm.type === "link" && (
                  <div>
                    <Label htmlFor="notificationUrl" className="text-sm font-medium">
                      URL (optional)
                    </Label>
                    <Input
                      id="notificationUrl"
                      type="url"
                      value={notificationForm.url}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com or leave empty for content-only"
                      className="mt-1"
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={notificationLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {notificationLoading ? "Adding..." : "Add Notification"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNotificationForm(false);
                      setNotificationForm({ title: "", content: "", target_year: "0", type: "announcement", url: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Notifications List */}
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader size="md" text="Loading notifications..." />
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification._id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold">{notification.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {notification.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {notification.target_year === "0" ? "All Years" : `Year ${notification.target_year}`}
                        </Badge>
                        {notification.created_by_role && (
                          <Badge variant="outline" className="text-xs text-blue-600">
                            {notification.created_by_role === 'faculty' ? 'Faculty' : 'Admin'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.content}</p>
                      {notification.url && (
                        <a
                          href={notification.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 mb-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {notification.url}
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Posted on {new Date(notification.created_at).toLocaleDateString()}
                        {notification.created_by && ` by ${notification.created_by}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No notifications yet</p>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default AdminDashboard;
