import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  DialogDescription,
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
import { fetchJson } from "@/utils/api";
import { toast } from "sonner";
import { Plus, BookOpen, Filter, Trash2, Edit } from "lucide-react";


type ExamType = "unit_test_internal_1" | "unit_test_internal_2" | "unit_test_external" | "lab_internal" | "lab_external";

interface Student {
  _id: string;
  roll_number: string;
  year_of_study: number;
  branch_code: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  semester: number;
  type: string; // "theory" | "lab" | "project" etc.
}

interface Mark {
  _id: string;
  student_id: string;
  subject_id: string;
  semester: number;
  exam_type: ExamType;
  marks_obtained: number;
  total_marks: number;
  academic_year: string;
  student_roll?: string;
  subject_name?: string;
  subject_code?: string;
}

const examTypeOptions: { value: ExamType; label: string }[] = [
  { value: "unit_test_internal_1", label: "Unit Test Internal 1" },
  { value: "unit_test_internal_2", label: "Unit Test Internal 2" },
  { value: "unit_test_external", label: "Unit Test External" },
  { value: "lab_internal", label: "Lab Internal" },
  { value: "lab_external", label: "Lab External" },
];


const FacultyMarks = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [subjectSubmitting, setSubjectSubmitting] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    semester: 1,
    branch_code: "CS",
    type: "theory",
    ut: 20,
    external: 80,
    sessional: 40,
  });
  const [selectedSemester, setSelectedSemester] = useState("1");
  const [selectedYear, setSelectedYear] = useState("1");
  const [selectedBranch, setSelectedBranch] = useState<string>("CS");
  const [selectedSubjectType, setSelectedSubjectType] = useState<"all" | "theory" | "lab">("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);

  // Always show individual marks - no combining
  // This ensures Edit/Delete actions are always available
  const displayMarks = useMemo<Mark[]>(() => {
    return marks;
  }, [marks]);
  const [formData, setFormData] = useState({
    student_id: "",
    subject_id: "",
    marks_obtained: "",
    total_marks: "100",
    exam_type: "unit_test_internal_1",
    academicYear: "2025-26",
  });

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch filtered students based on year/branch
      const studParams = new URLSearchParams();
      studParams.set('year_of_study', selectedYear);
      studParams.set('branch_code', selectedBranch);
      const { res: studRes, data: studData } = await fetchJson(`/api/students?${studParams.toString()}`);
      if (studRes.ok) {
        setStudents(Array.isArray(studData) ? studData : []);
      }

      // Get faculty's assigned subjects from profile
      let activeAssignedSubjects = assignedSubjects;
      if (assignedSubjects.length === 0 && profile?.id) {
        const { res: profileRes, data: profileData } = await fetchJson(`/api/profiles?user_id=${profile.id}`);
        if (profileRes.ok && profileData?.assigned_subjects) {
          activeAssignedSubjects = profileData.assigned_subjects;
          setAssignedSubjects(profileData.assigned_subjects);
        }
      }

      // Fetch subjects for selected semester
      const { res: subjRes, data: subjData } = await fetchJson("/api/subjects");
      if (subjRes.ok) {
        const all = Array.isArray(subjData) ? subjData : [];
        setAllSubjects(all);
        let filtered = all.filter((s: Subject) => s.semester === Number(selectedSemester));
        if (activeAssignedSubjects.length > 0) {
          filtered = filtered.filter((s: Subject) => activeAssignedSubjects.includes(s._id));
        }
        setSubjects(filtered);
      }

      // Fetch marks only for selected student
      if (selectedStudent) {
        const params = new URLSearchParams();
        params.set('semester', selectedSemester);
        params.set('student_id', selectedStudent);

        const { res: marksRes, data: marksData } = await fetchJson(`/api/marks?${params.toString()}`);
        if (marksRes.ok) {
          let marksList: Mark[] = Array.isArray(marksData) ? marksData : [];
          // filter by subject type if not 'all'
          if (selectedSubjectType !== "all" && subjects.length > 0) {
            const allowed = subjects
              .filter((s) => s.type === selectedSubjectType)
              .map((s) => s._id);
            marksList = marksList.filter((m) => allowed.includes(m.subject_id));
          }
          if (activeAssignedSubjects.length > 0) {
            marksList = marksList.filter((m) => activeAssignedSubjects.includes(m.subject_id));
          }
          setMarks(marksList);
        }
      } else {
        setMarks([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "faculty") {
      fetchData();
    }
  }, [profile, selectedSemester, selectedSubjectType, selectedStudent, selectedYear, selectedBranch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
      if (!selectedStudent) {
        toast.error("No student selected");
        setSubmitting(false);
        return;
      }
      const marksObtained = Number(formData.marks_obtained);
      const totalMarks = Number(formData.total_marks);

      if (isNaN(marksObtained) || isNaN(totalMarks)) {
        toast.error("Invalid marks values");
        setSubmitting(false);
        return;
      }

      if (marksObtained > totalMarks) {
        toast.error("Marks obtained cannot exceed total marks");
        setSubmitting(false);
        return;
      }

      // Validate that faculty is marking for an assigned subject
      if (assignedSubjects.length > 0 && !assignedSubjects.includes(formData.subject_id)) {
        toast.error("You can only mark for subjects assigned to you");
        setSubmitting(false);
        return;
      }

      // use selected exam_type from form if provided, otherwise determine default from subject
      const subj = subjects.find((s) => s._id === formData.subject_id);
      const examType: ExamType = (formData as any).exam_type
        ? (formData as any).exam_type
        : subj?.type === "lab"
        ? "lab_internal"
        : "unit_test_internal_1";
      
      const method = editingMark ? "PUT" : "POST";
      const url = editingMark ? `/api/marks/${editingMark._id}` : "/api/marks";
      
      const { res, data } = await fetchJson(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent,
          subject_id: formData.subject_id,
          semester: Number(selectedSemester),
          exam_type: examType,
          marks_obtained: marksObtained,
          total_marks: totalMarks,
          academic_year: formData.academicYear,
          entered_by: profile.id,
        }),
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to save marks");
        setSubmitting(false);
        return;
      }

      toast.success(editingMark ? "Marks updated successfully" : "Marks saved successfully");
      setIsDialogOpen(false);
      setEditingMark(null);
      setFormData({
        student_id: "",
        subject_id: "",
        marks_obtained: "",
        total_marks: "100",
        exam_type: "unit_test_internal_1",
        academicYear: "2025-26",
      });
      fetchData();
    } catch (error) {
      console.error("Error saving marks:", error);
      toast.error("Failed to save marks");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (mark: Mark) => {
    if (!confirm("Are you sure you want to delete this marks entry?")) return;

    try {
      const { res, data } = await fetchJson(`/api/marks/${mark._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error(data?.error || "Failed to delete marks");
        return;
      }

      toast.success("Marks deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting marks:", error);
      toast.error("Failed to delete marks");
    }
  };

  const handleEdit = (mark: Mark) => {
    setEditingMark(mark);
    setFormData({
      student_id: mark.student_id,
      subject_id: mark.subject_id,
      marks_obtained: String(mark.marks_obtained),
      total_marks: String(mark.total_marks),
      exam_type: mark.exam_type,
      academicYear: mark.academic_year,
    });
    setIsDialogOpen(true);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading marks..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="faculty" userName={profile?.full_name} />
      <PageWrapper>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Marks Management</h1>
            
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Marks
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingMark ? "Edit Marks Entry" : "Add Marks Entry"}</DialogTitle>
                <DialogDescription>
                  {editingMark ? "Update the marks for this student." : "Enter marks for a student in the selected semester and exam type."}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label>Student</Label>
                  <p className="mt-1">
                    {students.find((s) => s._id === selectedStudent)?.roll_number || "(none)"}
                  </p>
                </div>

                <div>
                  <Label>Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, subject_id: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      No subjects assigned for this semester. Contact admin to assign subjects.
                    </p>
                  )}
                </div>

                <div>
                  <Label>Exam Type</Label>
                  <Select
                    value={formData.exam_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, exam_type: value as ExamType })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select exam type" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypeOptions.map((op) => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Marks Obtained</Label>
                    <Input
                      type="number"
                      value={formData.marks_obtained}
                      onChange={(e) =>
                        setFormData({ ...formData, marks_obtained: e.target.value })
                      }
                      placeholder="e.g., 85"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Total Marks</Label>
                    <Input
                      type="number"
                      value={formData.total_marks}
                      onChange={(e) =>
                        setFormData({ ...formData, total_marks: e.target.value })
                      }
                      placeholder="e.g., 100"
                      className="mt-1"
                    />
                  </div>
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
                    disabled={submitting || !formData.student_id || !formData.subject_id}
                    className="flex-1 btn-gradient"
                  >
                    {submitting ? <Loader size="sm" /> : "Save Marks"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          {/* Add Subject Dialog */}
          <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ml-3 btn-outline rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Create a subject for the selected semester and branch.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubjectSubmitting(true);
                  try {
                    const payload: any = {
                      code: subjectForm.code,
                      name: subjectForm.name,
                      semester: Number(subjectForm.semester),
                      branch_code: subjectForm.branch_code,
                      type: subjectForm.type,
                      marks:
                        subjectForm.type === "lab"
                          ? { sessional: Number(subjectForm.sessional), external: Number(subjectForm.external) }
                          : { ut: Number(subjectForm.ut), external: Number(subjectForm.external) },
                    };

                    const { res, data } = await fetchJson("/api/subjects", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                      toast.error(data?.error || "Failed to create subject");
                      return;
                    }

                    toast.success("Subject created");
                    setIsSubjectDialogOpen(false);
                    // reset
                    setSubjectForm({ code: "", name: "", semester: Number(selectedSemester), branch_code: subjectForm.branch_code || "CS", type: "theory", ut: 20, external: 80, sessional: 40 });
                    fetchData();
                  } catch (error) {
                    console.error("Error creating subject:", error);
                    toast.error("Failed to create subject");
                  } finally {
                    setSubjectSubmitting(false);
                  }
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <Label>Code</Label>
                  <Input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Semester</Label>
                    <Select value={String(subjectForm.semester)} onValueChange={(v) => setSubjectForm({ ...subjectForm, semester: Number(v) })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                          {[1,2,3,4,5,6].map((s)=> <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Input value={subjectForm.branch_code} onChange={(e) => setSubjectForm({ ...subjectForm, branch_code: e.target.value })} className="mt-1" />
                  </div>
                </div>

                <div>
                  <Label>Type</Label>
                  <Select value={subjectForm.type} onValueChange={(v: any) => setSubjectForm({ ...subjectForm, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theory">Theory</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {subjectForm.type === "lab" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sessional</Label>
                      <Input type="number" value={String(subjectForm.sessional)} onChange={(e) => setSubjectForm({ ...subjectForm, sessional: Number(e.target.value) })} className="mt-1" />
                    </div>
                    <div>
                      <Label>External</Label>
                      <Input type="number" value={String(subjectForm.external)} onChange={(e) => setSubjectForm({ ...subjectForm, external: Number(e.target.value) })} className="mt-1" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit Test (UT)</Label>
                      <Input type="number" value={String(subjectForm.ut)} onChange={(e) => setSubjectForm({ ...subjectForm, ut: Number(e.target.value) })} className="mt-1" />
                    </div>
                    <div>
                      <Label>External</Label>
                      <Input type="number" value={String(subjectForm.external)} onChange={(e) => setSubjectForm({ ...subjectForm, external: Number(e.target.value) })} className="mt-1" />
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsSubjectDialogOpen(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={subjectSubmitting || !subjectForm.code || !subjectForm.name} className="flex-1 btn-gradient">
                    {subjectSubmitting ? <Loader size="sm" /> : "Create Subject"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Year/branch filters and student listing */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-wrap gap-6 items-center mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                <option value=""></option>
                <option value="DCME">DCME</option>
              </select>
            </div>
          </div>

          {students.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {students.map((stu) => (
                <div
                  key={stu._id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition 
                    ${selectedStudent === stu._id ? 'border-primary bg-primary/10' : 'border-border'}
                  `}
                >
                  <div>
                    <p className="font-medium">{stu.roll_number}</p>
                    <p className="text-xs text-muted-foreground">
                      Year {stu.year_of_study} • {stu.branch_code}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedStudent(stu._id);
                      setFormData((f) => ({ ...f, student_id: stu._id }));
                      setIsDialogOpen(true);
                    }}
                  >
                    Add Marks
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">
              No students found for selected year/branch
            </p>
          )}
        </GlassCard>

        {/* Marks Table */}
        <GlassCard className="overflow-hidden">
          {marks.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Marks Obtained</TableHead>
                    <TableHead>Total Marks</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Combined</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayMarks.map((mark) => {
                    const percentage = ((mark.marks_obtained / mark.total_marks) * 100).toFixed(1);
                    return (
                      <TableRow key={mark._id}>
                        <TableCell className="font-medium">
                          {mark.student_roll}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{mark.subject_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {mark.subject_code}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{mark.marks_obtained}</TableCell>
                        <TableCell>{mark.total_marks}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              Number(percentage) >= 75
                                ? "bg-success/10 text-success"
                                : Number(percentage) >= 50
                                ? "bg-warning/10 text-warning"
                                : "bg-destructive/10 text-destructive"
                            }`}
                          >
                            {percentage}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {mark.marks_obtained}/{mark.total_marks}
                        </TableCell>
                        <TableCell>
                          {Number(percentage) >= 50 ? (
                            <span className="text-success font-semibold">Pass</span>
                          ) : (
                            <span className="text-destructive font-semibold">Fail</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(mark)}
                              className="hover:bg-primary/10 hover:text-primary"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mark)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : !selectedStudent ? (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No student selected</h3>
              <p className="text-muted-foreground mb-4">
                Please choose a student from the list above to view or add marks.
              </p>
            </div>
          ) : (
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No marks found</h3>
              <p className="text-muted-foreground mb-4">
                No marks entries for Semester {selectedSemester}
              </p>
              <Button onClick={() => setIsDialogOpen(true)} className="btn-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add First Entry
              </Button>
            </div>
          )}
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultyMarks;
