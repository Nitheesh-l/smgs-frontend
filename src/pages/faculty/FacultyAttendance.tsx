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
  const [attendance, setAttendance] = useState<Record<string, boolean[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const TOTAL_PERIODS = 7;

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

      // Build attendance map with period tracking as boolean array
      const attendanceMap: Record<string, boolean[]> = {};
      
      // Initialize all students with all 7 periods as false (not attended)
      filteredStudents.forEach((student) => {
        attendanceMap[student._id] = Array(TOTAL_PERIODS).fill(false);
      });
      
      // Create a set of student IDs from filtered students for quick lookup
      const filteredStudentIds = new Set(filteredStudents.map(s => s._id));
      
      // Load existing attendance records
      attendanceArray.forEach((record: any) => {
        const sid = String(record.student_id ?? record.student_id?._id ?? '');
        if (filteredStudentIds.has(sid)) {
          const periods = Number(record.periods_present ?? 0);
          // Convert periods count to boolean array
          const periodsArray = Array(TOTAL_PERIODS).fill(false);
          for (let i = 0; i < periods && i < TOTAL_PERIODS; i++) {
            periodsArray[i] = true;
          }
          attendanceMap[sid] = periodsArray;
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

  const getAttendanceStatus = (periodsArray: boolean[]) => {
    const presentPeriods = periodsArray.filter(Boolean).length;
    if (presentPeriods <= 3) return "absent";
    if (presentPeriods === 4) return "half";
    return "full";
  };

  const togglePeriod = (studentId: string, periodIndex: number) => {
    setAttendance((prev) => {
      const current = prev[studentId] ?? Array(TOTAL_PERIODS).fill(false);
      const updated = [...current];
      updated[periodIndex] = !updated[periodIndex];
      return {
        ...prev,
        [studentId]: updated,
      };
    });
  };

  const markAllPresent = () => {
    const newAttendance: Record<string, boolean[]> = {};
    students.forEach((student) => {
      newAttendance[student._id] = Array(TOTAL_PERIODS).fill(true);
    });
    setAttendance(newAttendance);
  };

  const markAllAbsent = () => {
    const newAttendance: Record<string, boolean[]> = {};
    students.forEach((student) => {
      newAttendance[student._id] = Array(TOTAL_PERIODS).fill(false);
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

      // Prepare attendance records with period attendance
      const records = students.map((student) => {
        const periodsArray = attendance[student._id] ?? Array(TOTAL_PERIODS).fill(false);
        const periodsCounted = periodsArray.filter(Boolean).length;
        const status = getAttendanceStatus(periodsArray);
        return {
          student_id: student._id,
          date: dateStr,
          month,
          year,
          periods_present: periodsCounted,
          total_periods: TOTAL_PERIODS,
          status: status,
          marked_by: profile.id,
        };
      });

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

  const fullDayCount = Object.values(attendance).filter(periodsArray => {
    const count = periodsArray.filter(Boolean).length;
    return count > 5;
  }).length;
  const halfDayCount = Object.values(attendance).filter(periodsArray => {
    const count = periodsArray.filter(Boolean).length;
    return count >= 3 && count <= 5;
  }).length;
  const absentCount = Object.values(attendance).filter(periodsArray => {
    const count = periodsArray.filter(Boolean).length;
    return count < 3;
  }).length;

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
          <h1 className="text-3xl font-bold mb-2">Periods-based Attendance Management</h1>
          <p className="text-muted-foreground">
            Mark attendance by periods per day (0-{TOTAL_PERIODS} periods)
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
          </div>
        </GlassCard>

        {/* Attendance List */}
        <GlassCard className="p-6">
          {students.length > 0 ? (
            <>
              <div className="space-y-2">
                {students.map((student) => {
                  const periodsArray = attendance[student._id] ?? Array(TOTAL_PERIODS).fill(false);
                  const periodsCounted = periodsArray.filter(Boolean).length;
                  const status = getAttendanceStatus(periodsArray);
                  const rowBg =
                    status === "full" ? "bg-success/10" :
                    status === "half" ? "bg-yellow-500/10" :
                    "bg-destructive/10";

                  return (
                    <div
                      key={student._id}
                      className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border rounded-lg ${rowBg}`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                        <p className="font-medium text-sm">{student.roll_number}</p>
                        <p className="text-xs text-muted-foreground">{student.branch_code}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                        <span className="text-sm font-semibold">
                          {periodsCounted}/{TOTAL_PERIODS}
                        </span>
                        <div className="mt-1 sm:mt-0 overflow-x-auto">
                          <div className="inline-flex space-x-1">
                            {periodsArray.map((isPeriodPresent, periodIndex) => (
                              <button
                                key={periodIndex}
                                onClick={() => togglePeriod(student._id, periodIndex)}
                                className={`py-1 px-2 rounded text-xs font-semibold transition-all duration-200 border ${
                                  isPeriodPresent
                                    ? "bg-success/80 border-success text-white"
                                    : "bg-muted border-border text-muted-foreground hover:bg-muted/70"
                                }`}
                              >
                                P{periodIndex + 1}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
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
