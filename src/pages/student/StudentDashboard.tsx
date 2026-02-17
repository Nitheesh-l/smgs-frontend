import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/hooks/useAuth";
import { fetchJson } from "@/utils/api";
import { Calendar, BookOpen, TrendingUp, Award } from "lucide-react";

const StudentDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<any>(null);
  const [stats, setStats] = useState({
    attendancePercentage: 0,
    totalSubjects: 0,
    avgMarks: 0,
    totalExams: 0,
  });

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "student")) {
      navigate("/auth?type=student");
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    const fetchStudentData = async () => {
      if (!profile) return;

      try {
        // Fetch student record
        const { res: studentRes, data: studentData } = await fetchJson(
          `/api/students?profile_id=${encodeURIComponent(profile.id)}`
        );

        if (!studentRes.ok) {
          setLoading(false);
          return;
        }

        const student = Array.isArray(studentData) ? studentData[0] : studentData;
        if (!student) {
          setLoading(false);
          return;
        }

        setStudentData(student);

        // Fetch attendance stats
        const { res: attRes, data: attendanceData } = await fetchJson(
          `/api/attendance?student_id=${student.id || student._id}`
        );

        const attendanceList = Array.isArray(attendanceData) ? attendanceData : attendanceData?.data || [];
        const totalDays = attendanceList.length;
        const presentDays = attendanceList.filter((a: any) => a.status === 'Present' || a.status === 'Half Day').length;
        const attendancePercentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

        // Fetch marks stats (from API or calculate locally)
        const { res: marksRes, data: marksData } = await fetchJson(`/api/marks?student_id=${student._id || student.id}`);
        const marksList = Array.isArray(marksData) ? marksData : marksData?.data || [];
        
        const totalExams = marksList.length;
        const avgMarks = totalExams > 0
          ? Math.round(
              marksList.reduce((sum: number, m: any) => sum + (m.marks_obtained / m.total_marks) * 100, 0) / totalExams
            )
          : 0;

        // Fetch subjects for student's year
        const { res: subjRes, data: subjectsData } = await fetchJson(`/api/subjects`);
        const subjectsList = Array.isArray(subjectsData) ? subjectsData : subjectsData?.data || [];
        
        const semesterStart = (student.year_of_study - 1) * 2 + 1;
        const semesterEnd = student.year_of_study * 2;
        const studentSubjects = subjectsList.filter(
          (s: any) => s.semester >= semesterStart && s.semester <= semesterEnd
        );

        setStats({
          attendancePercentage,
          totalSubjects: studentSubjects.length,
          avgMarks,
          totalExams,
        });
      } catch (error) {
        console.error("Error fetching student data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (profile?.role === "student") {
      fetchStudentData();
    }
  }, [profile]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  if (!studentData) {
    return (
      <>
        <GlassNav role="student" userName={profile?.full_name} />
        <PageWrapper>
          <GlassCard className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Account Not Linked</h2>
            <p className="text-muted-foreground">
              Your account is not yet linked to a student record. Please contact your faculty.
            </p>
          </GlassCard>
        </PageWrapper>
      </>
    );
  }

  return (
    <>
      <GlassNav role="student" userName={profile?.full_name} />
      <PageWrapper>
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Welcome, <span className="text-gradient">{profile?.full_name}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
            <span>Roll No: <strong className="text-foreground">{studentData.roll_number}</strong></span>
            <span>•</span>
            <span>Year {studentData.year_of_study}</span>
            <span>•</span>
            <span>{studentData.branch_code}</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Attendance"
            value={`${stats.attendancePercentage}%`}
            icon={<Calendar className="w-6 h-6" />}
            variant={stats.attendancePercentage >= 75 ? "success" : "warning"}
          />
          <StatCard
            title="Average Marks"
            value={`${stats.avgMarks}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant={stats.avgMarks >= 60 ? "primary" : "warning"}
          />
          <StatCard
            title="Total Subjects"
            value={stats.totalSubjects}
            icon={<BookOpen className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title="Exams Taken"
            value={stats.totalExams}
            icon={<Award className="w-6 h-6" />}
            variant="default"
          />
        </div>

        {/* Quick Info Cards */}
        <div className="grid md:grid-cols-2 gap-6">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Attendance Summary
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Current Percentage</span>
                <span className={`text-2xl font-bold ${
                  stats.attendancePercentage >= 75 ? "text-success" : "text-warning"
                }`}>
                  {stats.attendancePercentage}%
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    stats.attendancePercentage >= 75 ? "bg-success" : "bg-warning"
                  }`}
                  style={{ width: `${stats.attendancePercentage}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {stats.attendancePercentage >= 75
                  ? "Great! You have good attendance."
                  : "Warning: Your attendance is below 75%. Please attend more classes."}
              </p>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-accent" />
              Academic Performance
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Average Score</span>
                <span className={`text-2xl font-bold ${
                  stats.avgMarks >= 60 ? "text-primary" : "text-warning"
                }`}>
                  {stats.avgMarks}%
                </span>
              </div>
              <div className="h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${stats.avgMarks}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                You have taken {stats.totalExams} exams across {stats.totalSubjects} subjects.
              </p>
            </div>
          </GlassCard>
        </div>
      </PageWrapper>
    </>
  );
};

export default StudentDashboard;
