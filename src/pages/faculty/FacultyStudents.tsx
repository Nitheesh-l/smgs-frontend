import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJson } from "@/utils/api";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Users, Phone, User } from "lucide-react";
import { z } from "zod";

type Gender = "male" | "female" | "other";

interface Student {
  _id: string;  // ✅ Change from 'id' to '_id'
  roll_number: string;
  year_of_study: number;
  gender: Gender;
  phone_number: string | null;
  branch_code: string;
  created_at: string;
  profile_id: string | null;
}

const studentSchema = z.object({
  roll_number: z.string().min(1, "Roll number is required"),
  full_name: z.string().min(2, "Full name is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  year_of_study: z.number().min(1).max(3),
  gender: z.enum(["male", "female", "other"]),
  phone_number: z.string().optional(),
  branch_code: z.string().min(1, "Branch code is required"),
});

const FacultyStudents = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [formData, setFormData] = useState({
    roll_number: "",
    full_name: "",
    password: "",
    year_of_study: 1,
    gender: "male" as Gender,
    phone_number: "",
    branch_code: "CS",
  });

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  const fetchStudents = async () => {
    try {
      const { res, data } = await fetchJson(`/api/students?year_of_study=${selectedYear}`);

      if (!res.ok) {
        toast.error(data?.error || "Failed to fetch students");
        return;
      }

      // Ensure data is an array
      const studentsArray = Array.isArray(data) ? data : data?.students || [];
      setStudents(studentsArray);
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && profile) {
      fetchStudents();
    }
  }, [profile, authLoading, selectedYear]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = studentSchema.safeParse({
        ...formData,
        year_of_study: Number(formData.year_of_study),
      });

      if (!result.success) {
        toast.error(result.error.errors[0].message);
        setSubmitting(false);
        return;
      }

      const method = editingStudent ? "PUT" : "POST";
      const url = editingStudent ? `/api/students/${editingStudent._id}` : "/api/students";  // ✅ Use _id

      const { res, data } = await fetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roll_number: formData.roll_number,
          full_name: formData.full_name,
          password: formData.password,
          year_of_study: Number(formData.year_of_study),
          gender: formData.gender,
          phone_number: formData.phone_number || null,
          branch_code: formData.branch_code,
        }),
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to save student");
        setSubmitting(false);
        return;
      }

      toast.success(editingStudent ? "Student updated successfully" : "Student added successfully");
      setIsDialogOpen(false);
      resetForm();
      fetchStudents();
    } catch (error) {
      console.error("Error saving student:", error);
      toast.error("Failed to save student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (student: Student) => {
    if (!confirm(`Are you sure you want to delete student ${student.roll_number}?`)) {
      return;
    }

    try {
      const { res, data } = await fetchJson(`/api/students/${student._id}`, {  // ✅ Use _id
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete student");
        return;
      }

      toast.success("Student deleted successfully");
      fetchStudents();
    } catch (error) {
      console.error("Error deleting student:", error);
      toast.error("Failed to delete student");
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      roll_number: student.roll_number,
      full_name: "",  
      password: "",
      year_of_study: student.year_of_study,
      gender: student.gender,
      phone_number: student.phone_number || "",
      branch_code: student.branch_code,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      roll_number: "",
      full_name: "",
      password: "",
      year_of_study: 1,
      gender: "male",
      phone_number: "",
      branch_code: "CS",
    });
    setEditingStudent(null);
  };

  const filteredStudents = students.filter(
    (student) =>
      student.roll_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.branch_code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading students..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="faculty" userName={profile?.full_name} />
      <PageWrapper>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Student Management</h1>
            <p className="text-muted-foreground">
              Manage student registrations and details
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="btn-gradient rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="roll_number">Roll Number</Label>
                  <Input
                    id="roll_number"
                    value={formData.roll_number}
                    onChange={(e) =>
                      setFormData({ ...formData, roll_number: e.target.value })
                    }
                    placeholder="e.g., CS2021001"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                    placeholder="e.g., John Doe"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    placeholder="Set initial password (min 6 characters)"
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year_of_study">Year of Study</Label>
                    <Select
                      value={String(formData.year_of_study)}
                      onValueChange={(value) =>
                        setFormData({ ...formData, year_of_study: Number(value) })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="branch_code">Branch Code</Label>
                    <Select
                      value={formData.branch_code}
                      onValueChange={(value) =>
                        setFormData({ ...formData, branch_code: value })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CSE">CSE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value: Gender) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="phone_number">Phone Number (Optional)</Label>
                  <Input
                    id="phone_number"
                    value={formData.phone_number}
                    onChange={(e) =>
                      setFormData({ ...formData, phone_number: e.target.value })
                    }
                    placeholder="e.g., +91 9876543210"
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 btn-gradient"
                  >
                    {submitting ? (
                      <Loader size="sm" />
                    ) : editingStudent ? (
                      "Update"
                    ) : (
                      "Add Student"
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Year Selector */}
        <div className="mb-6 flex gap-4">
          <p className="text-muted-foreground font-medium flex items-center">Filter by Year:</p>
          {[1, 2, 3].map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              onClick={() => setSelectedYear(year)}
              className="min-w-[80px]"
            >
              Year {year}
            </Button>
          ))}
        </div>

        {/* Search */}
        <GlassCard className="p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by roll number or branch..."
              className="pl-10"
            />
          </div>
        </GlassCard>

        {/* Students Table */}
        <GlassCard className="overflow-hidden">
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Branch</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student._id}>
                      <TableCell className="font-medium">
                        {student.roll_number}
                      </TableCell>
                      <TableCell>{student.year_of_study}</TableCell>
                      <TableCell>{student.gender}</TableCell>
                      <TableCell>{student.branch_code}</TableCell>
                      <TableCell>{student.phone_number || "-"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(student)}
                          className="hover:bg-primary/10 hover:text-primary"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(student)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Add your first student to get started"}
              </p>
              {!searchQuery && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="btn-gradient"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              )}
            </div>
          )}
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultyStudents;
