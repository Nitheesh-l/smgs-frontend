import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { fetchJson } from "@/utils/api";
import { toast } from "sonner";
import { Calendar, Check, X, Save, ChevronLeft, ChevronRight } from "lucide-react";

interface Student {
  _id: string;  // ✅ Correct
  roll_number: string;
  year_of_study: number;
  branch_code: string;
}

interface AttendanceRecord {
  student_id: string;
  date: string;
  is_present: boolean;
}

const FacultyAttendance = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  const fetchStudentsAndAttendance = async () => {
    try {
      setLoading(true);

      // Fetch students filtered by year
      const { res: studentsRes, data: studentsData } = await fetchJson(`/api/students?year_of_study=${selectedYear}`);

      if (!studentsRes.ok) throw new Error("Failed to fetch students");

      // Ensure data is an array
      const studentsArray = Array.isArray(studentsData) ? studentsData : studentsData?.students || [];
      const filteredStudents = studentsArray
        .sort((a: Student, b: Student) => a.roll_number.localeCompare(b.roll_number));
      setStudents(filteredStudents);

      // Fetch attendance for selected date
      const dateStr = selectedDate.toISOString().split("T")[0];
      const { res: attendanceRes, data: attendanceData } = await fetchJson(
        `/api/attendance?date=${dateStr}`
      );

      if (!attendanceRes.ok) throw new Error("Failed to fetch attendance");

      // Ensure attendance data is an array
      const attendanceArray = Array.isArray(attendanceData) ? attendanceData : attendanceData?.data || [];

      // Build attendance map. Server stores periods_present/total_periods/status.
      const attendanceMap: Record<string, boolean> = {};
      
      // Create a set of student IDs from filtered students for quick lookup
      const filteredStudentIds = new Set(filteredStudents.map(s => s._id));
      
      // Only add attendance records for students in the selected year
      attendanceArray.forEach((record: any) => {
        const sid = String(record.student_id ?? record.student_id?._id ?? '');
        // Only include attendance if this student is in the selected year
        if (filteredStudentIds.has(sid)) {
          const periods = Number(record.periods_present ?? 0);
          const status = record.status ?? '';
          attendanceMap[sid] = periods > 0 || status === 'Present';
        }
      });
      setAttendance(attendanceMap);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "faculty") {
      fetchStudentsAndAttendance();
    }
  }, [profile, selectedYear, selectedDate]);

  const toggleAttendance = (studentId: string) => {
    setAttendance((prev) => {
      const newAttendance = { ...prev };
      // Toggle only this specific student
      newAttendance[studentId] = !newAttendance[studentId];
      return newAttendance;
    });
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, boolean> = {};
    students.forEach((student) => {
      newAttendance[student._id] = true;  // Use _id
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance: Record<string, boolean> = {};
    students.forEach((student) => {
      newAttendance[student._id] = false;  // Use _id
    });
    setAttendance(newAttendance);
  };

  const saveAttendance = async () => {
    if (!profile) return;
    setSaving(true);

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const month = selectedDate.getMonth() + 1;
      const year = selectedDate.getFullYear();

      // Prepare attendance records (use periods_present/total_periods expected by server)
      const totalPeriods = 7;
      const records = students.map((student) => ({
        student_id: student._id,
        date: dateStr,
        month,
        year,
        periods_present: attendance[student._id] ? totalPeriods : 0,
        total_periods: totalPeriods,
        marked_by: profile.id,
      }));

      const { res, data } = await fetchJson("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records, date: dateStr }),
      });

      if (!res.ok) throw new Error(data?.error || "Failed to save attendance");

      toast.success("Attendance saved successfully");
    } catch (error) {
      console.error("Error saving attendance:", error);
      toast.error("Failed to save attendance");
    } finally {
      setSaving(false);
    }
  };

  const changeDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setSelectedDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDatePart = (date: Date) => {
    const day = date.getDate();
    return day <= 15 ? "Part 1 (1-15)" : "Part 2 (16-30/31)";
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;
  const absentCount = students.length - presentCount;

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading attendance..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="faculty" userName={profile?.full_name} />
      <PageWrapper>
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Attendance Management</h1>
          <p className="text-muted-foreground">
            Mark daily attendance for students
          </p>
        </div>

        {/* Controls */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            {/* Date Navigation */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeDate("prev")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-center">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="w-5 h-5 text-primary" />
                  {formatDate(selectedDate)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {getDatePart(selectedDate)}
                </p>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => changeDate("next")}
                disabled={selectedDate >= new Date()}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Year Filter */}
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">Filter by Year:</span>
              <div className="flex gap-2">
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
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllPresent}
              className="text-success hover:bg-success/10"
            >
              <Check className="w-4 h-4 mr-1" />
              Mark All Present
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAbsent}
              className="text-destructive hover:bg-destructive/10"
            >
              <X className="w-4 h-4 mr-1" />
              Mark All Absent
            </Button>
            <div className="flex-1" />
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-success" />
                Present: {presentCount}
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-destructive" />
                Absent: {absentCount}
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Attendance Grid */}
        <GlassCard className="p-6">
          {students.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {students.map((student) => (
                  <button
                    key={student._id}
                    onClick={() => toggleAttendance(student._id)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      attendance[student._id]
                        ? "bg-success/10 border-success/30 hover:bg-success/20"
                        : "bg-destructive/10 border-destructive/30 hover:bg-destructive/20"
                    }`}
                  >
                    <div className="flex items-center justify-center mb-2">
                      {attendance[student._id] ? (
                        <Check className="w-6 h-6 text-success" />
                      ) : (
                        <X className="w-6 h-6 text-destructive" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">
                      {student.roll_number}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {student.branch_code}
                    </p>
                  </button>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-border flex justify-end">
                <Button
                  onClick={saveAttendance}
                  disabled={saving}
                  className="btn-gradient px-8"
                >
                  {saving ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Attendance
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-16">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No students found</h3>
              <p className="text-muted-foreground">
                No students registered for Year {selectedYear}
              </p>
            </div>
          )}
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultyAttendance;
