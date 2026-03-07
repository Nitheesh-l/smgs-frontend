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
import { Plus, BookOpen, Filter, Trash2, Edit, ExternalLink } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";


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
  branch_code: string;
  marks?: {
    sessional?: number;
    external?: number;
    ut?: number;
  };
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

const getSubjectTotalMarks = (subject: Subject) => {
  if (subject.type === 'lab') {
    return (subject.marks as any).sessional + (subject.marks as any).external;
  } else {
    return (subject.marks as any).ut + (subject.marks as any).external;
  }
};


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
  const [selectedBranch, setSelectedBranch] = useState<string>("DCME");
  const [selectedSubjectType, setSelectedSubjectType] = useState<"all" | "theory" | "lab">("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [editingMark, setEditingMark] = useState<Mark | null>(null);
  const [assignedSubjects, setAssignedSubjects] = useState<string[]>([]);
  const [formSubjects, setFormSubjects] = useState<Subject[]>([]);

  // Bulk marks entry state
  const [selectedSubjectForBulk, setSelectedSubjectForBulk] = useState<string>("");
  const [selectedExamTypeForBulk, setSelectedExamTypeForBulk] = useState<ExamType>("unit_test_internal_1");
  const [bulkMarksInputs, setBulkMarksInputs] = useState<Record<string, string>>({});
  const [customTotalMarks, setCustomTotalMarks] = useState<string>("100");

  // Links/Updates state
  const [links, setLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    url: "",
  });

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
    semester: selectedSemester,
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
        const list = Array.isArray(studData) ? studData : [];
        setStudents(list);
        // if current selectedStudent no longer exists, clear it
        if (selectedStudent && !list.find((s: Student) => s._id === selectedStudent)) {
          setSelectedStudent("");
          setMarks([]);
        }
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

  const fetchLinks = async () => {
    try {
      setLinksLoading(true);
      const { res, data } = await fetchJson("/api/links");
      if (res.ok) {
        setLinks(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching links:", error);
    } finally {
      setLinksLoading(false);
    }
  };

  useEffect(() => {
    // refetch whenever any of the filters change
    if (profile?.role === "faculty") {
      fetchData();
      fetchLinks();
    }
  }, [
    profile,
    selectedYear,
    selectedSemester,
    selectedBranch,
    selectedStudent,
    selectedSubjectType,
    assignedSubjects,
  ]);


  // Update year when semester changes
  useEffect(() => {
    const newYear = Math.ceil(Number(selectedSemester) / 2);
    setSelectedYear(String(newYear));
  }, [selectedSemester]);

  // Update semester when year changes (first semester of that year)
  useEffect(() => {
    const yearNum = Number(selectedYear);
    if (!isNaN(yearNum)) {
      const newSem = (yearNum - 1) * 2 + 1;
      if (selectedSemester !== String(newSem)) {
        setSelectedSemester(String(newSem));
      }
    }
  }, [selectedYear]);

  useEffect(() => {
    setSelectedSubjectForBulk("");
    setBulkMarksInputs({});
    setCustomTotalMarks("100");
  }, [selectedYear, selectedSemester, selectedBranch]);

  // Fetch subjects for form semester
  useEffect(() => {
    const fetchFormSubjects = async () => {
      if (!formData.semester) return;
      try {
        const params = new URLSearchParams();
        params.set('semester', formData.semester);
        params.set('branch_code', selectedBranch); // Add branch filter
        const { res, data } = await fetchJson(`/api/subjects?${params.toString()}`);
        if (res.ok) {
          const all = Array.isArray(data) ? data : [];
          let filtered = all.filter((s: Subject) => s.semester === Number(formData.semester) && s.branch_code === selectedBranch);
          if (assignedSubjects.length > 0) {
            filtered = filtered.filter((s: Subject) => assignedSubjects.includes(s._id));
          }
          setFormSubjects(filtered);
        }
      } catch (err) {
        console.error("Error fetching form subjects:", err);
      }
    };
    if (formData.semester) {
      fetchFormSubjects();
    }
  }, [formData.semester, selectedBranch, assignedSubjects]);

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
      const subj = formSubjects.find((s) => s._id === formData.subject_id);
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
          semester: Number(formData.semester),
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
        semester: selectedSemester,
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
      semester: String(mark.semester),
    });
    setIsDialogOpen(true);
  };

  // Links handlers
  const handleAddLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkForm.title.trim() || !linkForm.description.trim()) {
      toast.error("Title and description are required");
      return;
    }

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...linkForm,
          created_by: profile?.full_name,
          created_by_role: 'faculty'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to add link");
        return;
      }

      toast.success("Link/Update added successfully");
      setLinks(prev => [data.link, ...prev]);
      setLinkForm({ title: "", description: "", url: "" });
      setShowLinkForm(false);
    } catch (error) {
      console.error("Add link error:", error);
      toast.error("Failed to add link");
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

  const handleBulkSubmit = async () => {
    if (!selectedSubjectForBulk) {
      toast.error("Please select a subject");
      return;
    }
    const subject = subjects.find(s => s._id === selectedSubjectForBulk);
    if (!subject) {
      toast.error("Subject not found");
      return;
    }
    const totalMarks = Number(customTotalMarks) || 100;
    const entries = Object.entries(bulkMarksInputs).filter(([_, marks]) => marks.trim() !== '');
    if (entries.length === 0) {
      toast.error("No marks entered");
      return;
    }
    try {
      setSubmitting(true);
      for (const [studentId, marksStr] of entries) {
        const marksObtained = Number(marksStr);
        if (isNaN(marksObtained) || marksObtained < 0 || marksObtained > totalMarks) {
          toast.error(`Invalid marks for student ${students.find(s => s._id === studentId)?.roll_number}. Must be between 0 and ${totalMarks}`);
          return;
        }
        const payload = {
          student_id: studentId,
          subject_id: selectedSubjectForBulk,
          marks_obtained: marksObtained,
          total_marks: totalMarks,
          exam_type: selectedExamTypeForBulk,
          academic_year: "2025-26",
          semester: Number(selectedSemester),
          entered_by: profile?.id,
        };
        const existingMark = marks.find(m => m.student_id === studentId && m.subject_id === selectedSubjectForBulk && m.exam_type === selectedExamTypeForBulk);
        const method = existingMark ? 'PUT' : 'POST';
        const url = existingMark ? `/api/marks/${existingMark._id}` : '/api/marks';
        const { res, data } = await fetchJson(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          toast.error(data?.error || `Failed to save marks for ${students.find(s => s._id === studentId)?.roll_number}`);
          return;
        }
      }
      toast.success("Bulk marks saved successfully");
      setBulkMarksInputs({});
      fetchData(); // refresh marks
    } catch (error) {
      console.error("Bulk submit error:", error);
      toast.error("Failed to save marks");
    } finally {
      setSubmitting(false);
    }
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
                  <Label>Semester</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) =>
                      setFormData({ ...formData, semester: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6].map((s) => (
                        <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      {formSubjects.map((subject) => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formSubjects.length === 0 && (
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
                      created_by: profile?.id,
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
                    // automatically add new subject to faculty's assigned list so it appears in marks dropdown
                    if (data?._id) {
                      setAssignedSubjects((prev) => {
                        if (prev.includes(data._id)) return prev;
                        return [...prev, data._id];
                      });
                    }
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
                <option value="DCME">DCME</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                {[1,2,3,4,5,6].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-4 items-center mb-4 p-4 bg-muted/50 rounded-lg sm:text-wrap">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Bulk Marks Entry:</span>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto p-2">
                <span className="bg-cyan-300 text-sm text-muted-foreground">Subject:</span>
                <select
                  value={selectedSubjectForBulk}
                  onChange={(e) => setSelectedSubjectForBulk(e.target.value)}
                  className="px-2 py-1 w-full border border-border rounded-md bg-background text-sm sm:text-wrap"
                >
                  <option className="bg-cyan-300 w-fit" value="">Select Subject</option>
                  {subjects.map((s) => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Exam Type:</span>
                <select
                  value={selectedExamTypeForBulk}
                  onChange={(e) => setSelectedExamTypeForBulk(e.target.value as ExamType)}
                  className="px-2 py-1 border border-border rounded-md bg-background text-sm"
                >
                  {examTypeOptions.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Total Marks:</span>
                <Input
                  type="number"
                  value={customTotalMarks}
                  onChange={(e) => setCustomTotalMarks(e.target.value)}
                  className="w-20"
                  min="1"
                />
              </div>
            </div>
          )}

          {students.length > 0 ? (
            selectedSubjectForBulk ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Roll Number</TableHead>
                      <TableHead>Marks (out of {Number(customTotalMarks) || 100})</TableHead>
                      {/* <TableHead>Total Marks</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((stu) => {
                      const existingMark = marks.find(m => m.student_id === stu._id && m.subject_id === selectedSubjectForBulk && m.exam_type === selectedExamTypeForBulk);
                      return (
                        <TableRow key={stu._id}>
                          <TableCell className="font-medium">{stu.roll_number}</TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={bulkMarksInputs[stu._id] || ''}
                              onChange={(e) => setBulkMarksInputs(prev => ({ ...prev, [stu._id]: e.target.value }))}
                              placeholder="Enter marks"
                              className="w-24"
                              min="0"
                              max={Number(customTotalMarks) || 100}
                            />
                          </TableCell>
                          {/* <TableCell>{existingMark ? existingMark.total_marks : 'N/A'}</TableCell> */}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <div className="flex justify-end mt-4">
                  <Button onClick={handleBulkSubmit} disabled={submitting} className="btn-gradient">
                    {submitting ? <Loader size="sm" /> : "Save Bulk Marks"}
                  </Button>
                </div>
              </div>
            ) : (
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
                        setFormData((f) => ({ ...f, student_id: stu._id, semester: selectedSemester }));
                        setIsDialogOpen(true);
                      }}
                    >
                      Add Marks
                    </Button>
                  </div>
                ))}
              </div>
            )
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

        {/* Links/Updates Section
        <GlassCard className="p-6 mt-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">Links & Resources</h2>
              <p className="text-muted-foreground text-sm">Share helpful links and resources with your students</p>
            </div>
            <Button
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="bg-green-600 hover:bg-green-700"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Link
            </Button>
          </div>

          {/* Add Link Form */}
          {/* {showLinkForm && (
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
                    placeholder="Enter title for the link/resource"
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
                    placeholder="https://example.com or leave empty for content-only resource"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Add Link/Resource
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowLinkForm(false);
                      setLinkForm({ title: "", description: "", url: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </GlassCard>
          )} */} 

          {/* Links List */}
          {/* {linksLoading ? (
            <div className="flex justify-center py-8">
              <Loader size="md" text="Loading links..." />
            </div>
          ) : links.length > 0 ? (
            <div className="space-y-4">
              {links.map((link) => (
                <div key={link._id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition">
                  <div className="flex-1">
                    <h4 className="font-semibold">{link.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{link.description}</p>
                    {link.url && (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {link.url}
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Posted on {new Date(link.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteLink(link._id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No links or resources yet</p>
          )}
        </GlassCard> */}
      </PageWrapper>
    </>
  );
};

export default FacultyMarks;
