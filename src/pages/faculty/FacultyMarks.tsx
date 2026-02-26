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
import { Plus, BookOpen, Filter, Trash2 } from "lucide-react";

// exam types are no longer exposed in faculty UI; keep type for backend compatibility if needed
// but most UI logic handles combined marks by subject/subject type.

type ExamType = "unit_test_internal" | "unit_test_external" | "lab_internal" | "lab_external";

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


const FacultyMarks = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
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
  // exam type no longer used for filtering; backend receives a default based on subject
  const [selectedSubjectType, setSelectedSubjectType] = useState<"all" | "theory" | "lab">("all");
  const [selectedStudent, setSelectedStudent] = useState<string>("all");

  // combine internal+external for theory subjects when Subject Type is 'all' or 'theory'
  // but if a specific student is selected, show entries separately
  const displayMarks = useMemo<(Mark & { combined?: boolean })[]>(() => {
    if (selectedStudent !== "all") {
      return marks;
    }
    if (selectedSubjectType === "lab") {
      return marks;
    }

    // group by student + subject; for lab keep exam_type separate so lab rows stay distinct
    const map = new Map<string, (Mark & { count: number })>();
    marks.forEach((m) => {
      const subj = subjects.find((s) => s._id === m.subject_id);
      const isTheory = subj?.type === "theory";
      const key = isTheory ? `${m.student_id}-${m.subject_id}-theory` : `${m.student_id}-${m.subject_id}-${m.exam_type}`;

      if (!map.has(key)) {
        map.set(key, { ...m, count: 1 });
      } else {
        const existing = map.get(key)!;
        existing.marks_obtained += m.marks_obtained;
        existing.total_marks += m.total_marks;
        existing.count += 1;
      }
    });

    const result: (Mark & { combined?: boolean })[] = [];
    map.forEach((m) => {
      const subj = subjects.find((s) => s._id === m.subject_id);
      const isTheory = subj?.type === "theory";
      if (m.count > 1 && isTheory) {
        // combine theory internal+external into a 100-mark line
        const percent = (m.marks_obtained / m.total_marks) * 100;
        result.push({
          ...m,
          marks_obtained: parseFloat(percent.toFixed(1)),
          total_marks: 100,
          subject_name: (m.subject_name || "") + " (Theory - Combined)",
          combined: true,
        });
      } else {
        result.push(m);
      }
    });
    return result;
  }, [marks, selectedSubjectType, subjects]);
  const [formData, setFormData] = useState({
    student_id: "",
    subject_id: "",
    marks_obtained: "",
    total_marks: "100",
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

      // Fetch students
      const { res: studRes, data: studData } = await fetchJson("/api/students");
      if (studRes.ok) {
        setStudents(Array.isArray(studData) ? studData : []);
      }

      // Fetch subjects for selected semester
      const { res: subjRes, data: subjData } = await fetchJson("/api/subjects");
      if (subjRes.ok) {
        const allSubjects = Array.isArray(subjData) ? subjData : [];
        const filtered = allSubjects.filter((s: Subject) => s.semester === Number(selectedSemester));
        setSubjects(filtered);
      }

      // Fetch marks
      const params = new URLSearchParams();
      params.set('semester', selectedSemester);
      if (selectedStudent && selectedStudent !== "all") {
        params.set('student_id', selectedStudent);
      }

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
        setMarks(marksList);
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
  }, [profile, selectedSemester, selectedSubjectType, selectedStudent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSubmitting(true);

    try {
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

      // determine a default exam_type using the subject's declared type
      const subj = subjects.find((s) => s._id === formData.subject_id);
      const examType: ExamType = subj?.type === "lab" ? "lab_internal" : "unit_test_internal";
      const { res, data } = await fetchJson("/api/marks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: formData.student_id,
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

      toast.success("Marks saved successfully");
      setIsDialogOpen(false);
      setFormData({
        student_id: "",
        subject_id: "",
        marks_obtained: "",
        total_marks: "100",
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Marks Management</h1>
            <p className="text-muted-foreground">
              Enter and manage student exam marks
            </p>
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
                <DialogTitle>Add Marks Entry</DialogTitle>
                <DialogDescription>
                  Enter marks for a student in the selected semester and exam type.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label>Student (Semester {selectedSemester})</Label>
                  <Select
                    value={formData.student_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, student_id: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select student" />
                    </SelectTrigger>
                    <SelectContent>
                      {students
                        .filter((student) => {
                          // Filter by year-to-semester mapping: Year 1 → 1-2, Year 2 → 3-4, Year 3 → 5-6
                          const year = student.year_of_study;
                          const sem = Number(selectedSemester);
                          if (year === 1) return sem === 1 || sem === 2;
                          if (year === 2) return sem === 3 || sem === 4;
                          if (year === 3) return sem === 5 || sem === 6;
                          return false;
                        })
                        .sort((a, b) => a.roll_number.localeCompare(b.roll_number))
                        .map((student) => (
                          <SelectItem key={student._id} value={student._id}>
                            {student.roll_number} - Year {student.year_of_study}
                          </SelectItem>
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
                      {subjects.map((subject) => (
                        <SelectItem key={subject._id} value={subject._id}>
                          {subject.name} ({subject.code})
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

                {/* <div>
                  <Label>Academic Year</Label>
                  <Input
                    type="text"
                    value={formData.academicYear}
                    onChange={(e) =>
                      setFormData({ ...formData, academicYear: e.target.value })
                    }
                    placeholder="e.g., 2025-26"
                    className="mt-1"
                    pattern="\d{4}-\d{2}"
                  />
                </div> */}

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

        {/* Filters */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3].map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      Year {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Semester:</span>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const semesterStart = (Number(selectedYear) - 1) * 2 + 1;
                    const semesterEnd = Number(selectedYear) * 2;
                    return [semesterStart, semesterEnd].map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Student:</span>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  {students
                    .filter((s) => s.year_of_study === Number(selectedYear))
                    .sort((a, b) => a.roll_number.localeCompare(b.roll_number))
                    .map((student) => (
                      <SelectItem key={student._id} value={student._id}>
                        {student.roll_number}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Subject Type:</span>
              <Select
                value={selectedSubjectType}
                onValueChange={(v) => setSelectedSubjectType(v as "all"|"theory"|"lab")}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="theory">Theory</SelectItem>
                  <SelectItem value="lab">Lab</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
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
                          {!mark.combined && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(mark)}
                              className="hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
