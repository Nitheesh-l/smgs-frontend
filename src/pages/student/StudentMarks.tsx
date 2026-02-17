import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { fetchJson } from "@/utils/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Filter, Award } from "lucide-react";

type ExamType = "unit_test_internal" | "unit_test_external" | "lab_internal" | "lab_external";

interface Mark {
  id: string;
  semester: number;
  exam_type: ExamType;
  marks_obtained: number;
  total_marks: number;
  subject_name: string;
  subject_code: string;
}

const examTypeLabels: Record<ExamType, string> = {
  unit_test_internal: "Unit Test (Internal)",
  unit_test_external: "Unit Test (External)",
  lab_internal: "Lab (Internal)",
  lab_external: "Lab (External)",
};

const StudentMarks = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [selectedSemester, setSelectedSemester] = useState("1");

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "student")) {
      navigate("/auth?type=student");
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    const fetchStudentId = async () => {
      if (!profile) return;

      try {
        const { res, data } = await fetchJson(
          `/api/students?profile_id=${encodeURIComponent(profile.id)}`
        );

        if (res.ok) {
          const student = Array.isArray(data) ? data[0] : data;
          if (student) {
            setStudentId(student._id || student.id);
            setStudentData(student);
            // Set semester based on year: Year 1 -> Sem 1, Year 2 -> Sem 3, Year 3 -> Sem 5
            const defaultSemester = String((student.year_of_study - 1) * 2 + 1);
            setSelectedSemester(defaultSemester);
          }
        }
      } catch (error) {
        console.error("Error fetching student:", error);
      }
    };

    if (profile?.role === "student") {
      fetchStudentId();
    }
  }, [profile]);

  useEffect(() => {
    const fetchMarks = async () => {
      if (!studentId) return;
      setLoading(true);

      try {
        const { res, data } = await fetchJson(
          `/api/marks?student_id=${studentId}&semester=${selectedSemester}`
        );

        if (res.ok) {
          const marksData = Array.isArray(data) ? data : data?.data || [];
          setMarks(marksData);
        }
      } catch (error) {
        console.error("Error fetching marks:", error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchMarks();
    }
  }, [studentId, selectedSemester]);

  // Group marks by exam type
  const marksByExamType = marks.reduce((acc, mark) => {
    if (!acc[mark.exam_type]) {
      acc[mark.exam_type] = [];
    }
    acc[mark.exam_type].push(mark);
    return acc;
  }, {} as Record<ExamType, Mark[]>);

  // Calculate totals
  const totalMarksObtained = marks.reduce((sum, m) => sum + m.marks_obtained, 0);
  const totalMaxMarks = marks.reduce((sum, m) => sum + m.total_marks, 0);
  const overallPercentage = totalMaxMarks > 0 ? Math.round((totalMarksObtained / totalMaxMarks) * 100) : 0;

  if (authLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="student" userName={profile?.full_name} />
      <PageWrapper>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Marks Report</h1>
          <p className="text-muted-foreground">
            View your examination results and grades
          </p>
        </div>

        {/* Student Info */}
        {studentData && (
          <GlassCard className="p-6 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-semibold">{profile?.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Roll Number</p>
                <p className="font-semibold">{studentData.roll_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Year</p>
                <p className="font-semibold">Year {studentData.year_of_study}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Branch</p>
                <p className="font-semibold">{studentData.branch_code}</p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Semester Selector */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-primary" />
              <span className="font-medium">Select Semester:</span>
              <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {studentData && (() => {
                    const semesterStart = (studentData.year_of_study - 1) * 2 + 1;
                    const semesterEnd = studentData.year_of_study * 2;
                    return [semesterStart, semesterEnd].map((sem) => (
                      <SelectItem key={sem} value={String(sem)}>
                        Semester {sem}
                      </SelectItem>
                    ));
                  })()}
                </SelectContent>
              </Select>
            </div>
            {marks.length > 0 && (
              <div className="flex items-center gap-3">
                <Award className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Overall:</span>
                <span className={`text-xl font-bold ${
                  overallPercentage >= 75 ? "text-success" : 
                  overallPercentage >= 50 ? "text-warning" : "text-destructive"
                }`}>
                  {overallPercentage}%
                </span>
              </div>
            )}
          </div>
        </GlassCard>

        {loading ? (
          <GlassCard className="p-8">
            <Loader text="Loading marks..." />
          </GlassCard>
        ) : marks.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(marksByExamType).map(([examType, examMarks]) => (
              <GlassCard key={examType} className="overflow-hidden">
                <div className="p-4 border-b border-border bg-muted/30">
                  <h3 className="font-semibold flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    {examTypeLabels[examType as ExamType]}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="text-center">Marks Obtained</TableHead>
                        <TableHead className="text-center">Total Marks</TableHead>
                        <TableHead className="text-center">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {examMarks.map((mark) => {
                        const percentage = Math.round((mark.marks_obtained / mark.total_marks) * 100);
                        return (
                          <TableRow key={mark.id}>
                            <TableCell className="font-medium">
                              {mark.subject_name}
                            </TableCell>
                            <TableCell>
                              <span className="px-2 py-1 rounded-full bg-muted text-xs font-medium">
                                {mark.subject_code}
                              </span>
                            </TableCell>
                            <TableCell className="text-center font-semibold">
                              {mark.marks_obtained}
                            </TableCell>
                            <TableCell className="text-center text-muted-foreground">
                              {mark.total_marks}
                            </TableCell>
                            <TableCell className="text-center">
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
                                  percentage >= 75
                                    ? "bg-success/10 text-success"
                                    : percentage >= 50
                                    ? "bg-warning/10 text-warning"
                                    : "bg-destructive/10 text-destructive"
                                }`}
                              >
                                {percentage}%
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </GlassCard>
            ))}
          </div>
        ) : (
          <GlassCard className="p-16 text-center">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
            <h3 className="text-lg font-medium mb-2">No marks found</h3>
            <p className="text-muted-foreground">
              No marks have been entered for Semester {selectedSemester} yet.
            </p>
          </GlassCard>
        )}
      </PageWrapper>
    </>
  );
};

export default StudentMarks;
