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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/hooks/useAuth";
import { fetchJson } from "@/utils/api";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Check, X, Save, ChevronLeft, ChevronRight } from "lucide-react";

interface Student {
  _id: string; 
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null); // used for single-month detail view
  const [monthlyAttendance, setMonthlyAttendance] = useState<Record<string, any[]>>({});
  const [semesterStats, setSemesterStats] = useState<any>(null);
  const TOTAL_PERIODS = 7;

  // Semester configuration
  const semesters = [
    { id: 1, name: "1st Year - Semester 1", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 2, name: "1st Year - Semester 2", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 3, name: "2nd Year - Semester 3", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 4, name: "2nd Year - Semester 4", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 5, name: "3rd Year - Semester 5", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { id: 6, name: "3rd Year - Semester 6", months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  ];

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  // whenever semester changes reset month selections
  useEffect(() => {
    const sem = semesters.find(s => s.id === selectedSemester);
    if (sem) {
      setSelectedMonths([...sem.months]);
      setSelectedMonth(null);
    }
  }, [selectedSemester]);

  // sync single-month detail view when only one month selected
  useEffect(() => {
    if (selectedMonths.length === 1) {
      setSelectedMonth(selectedMonths[0]);
    } else {
      setSelectedMonth(null);
    }
  }, [selectedMonths]);

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

  const fetchMonthlyAttendance = async () => {
    try {
      setLoading(true);

      // Fetch students filtered by year
      const { res: studentsRes, data: studentsData } = await fetchJson(`/api/students?year_of_study=${selectedYear}`);
      if (!studentsRes.ok) throw new Error("Failed to fetch students");

      const studentsArray = Array.isArray(studentsData) ? studentsData : studentsData?.students || [];
      const filteredStudents = studentsArray
        .sort((a: Student, b: Student) => a.roll_number.localeCompare(b.roll_number));
      setStudents(filteredStudents);

      const currentSemester = semesters.find(s => s.id === selectedSemester);
      if (!currentSemester) return;

      const monthsToFetch = selectedMonths.length > 0 ? selectedMonths : currentSemester.months;

      const monthlyData: Record<string, any[]> = {};
      const semesterStatsData: any = {
        totalStudents: filteredStudents.length,
        monthlyStats: {},
        semesterTotal: { present: 0, total: 0 }
      };

      // Fetch attendance for each chosen month
      for (const month of monthsToFetch) {
        const { res: attendanceRes, data: attendanceData } = await fetchJson(
          `/api/attendance?year=${new Date().getFullYear()}&month=${month}`
        );

        if (!attendanceRes.ok) continue;

        const attendanceArray = Array.isArray(attendanceData) ? attendanceData : attendanceData?.data || [];

        // Group by student
        const studentAttendance: Record<string, any[]> = {};
        filteredStudents.forEach(student => {
          studentAttendance[student._id] = [];
        });

        attendanceArray.forEach((record: any) => {
          const sid = String(record.student_id ?? record.student_id?._id ?? '');
          if (studentAttendance[sid]) {
            studentAttendance[sid].push(record);
          }
        });

        // Calculate monthly stats
        const monthlyStats = {
          month,
          monthName: monthNames[month - 1],
          studentStats: {} as Record<string, { present: number; total: number; percentage: number }>
        };

        let monthTotalPresent = 0;
        let monthTotalDays = 0;

        filteredStudents.forEach(student => {
          const studentRecords = studentAttendance[student._id] || [];
          const presentDays = studentRecords.filter(r => r.status === 'Present' || r.status === 'Half Day').length;
          const totalDays = studentRecords.length;
          const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

          monthlyStats.studentStats[student._id] = {
            present: presentDays,
            total: totalDays,
            percentage
          };

          monthTotalPresent += presentDays;
          monthTotalDays += totalDays;
        });

        monthlyData[month] = Object.entries(monthlyStats.studentStats).map(([studentId, stats]) => ({
          studentId,
          ...stats
        }));

        semesterStatsData.monthlyStats[month] = {
          ...monthlyStats,
          totalPresent: monthTotalPresent,
          totalDays: monthTotalDays,
          averagePercentage: monthTotalDays > 0 ? Math.round((monthTotalPresent / monthTotalDays) * 100) : 0
        };

        semesterStatsData.semesterTotal.present += monthTotalPresent;
        semesterStatsData.semesterTotal.total += monthTotalDays;
      }

      semesterStatsData.semesterTotal.averagePercentage =
        semesterStatsData.semesterTotal.total > 0
          ? Math.round((semesterStatsData.semesterTotal.present / semesterStatsData.semesterTotal.total) * 100)
          : 0;

      setMonthlyAttendance(monthlyData);
      setSemesterStats(semesterStatsData);
    } catch (error) {
      console.error("Error fetching monthly data:", error);
      toast.error("Failed to fetch monthly data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === "faculty") {
      if (viewMode === 'daily') {
        fetchStudentsAndAttendance();
      } else {
        fetchMonthlyAttendance();
      }
    }
  }, [profile, selectedYear, selectedDate, viewMode, selectedSemester]);

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
        <div className="mb-6 sm:mb-8 mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            {viewMode === 'daily' ? 'Periods-based Attendance' : 'Monthly Attendance Report'}
          </h1>
        </div>

        {/* Controls */}
        <GlassCard className="p-4 sm:p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* View Mode Selector */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-muted-foreground text-center sm:text-left">View Mode:</span>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                <Button
                  variant={viewMode === 'daily' ? "default" : "outline"}
                  onClick={() => setViewMode('daily')}
                  className="min-w-[100px]"
                  size="sm"
                >
                  Daily View
                </Button>
                <Button
                  variant={viewMode === 'monthly' ? "default" : "outline"}
                  onClick={() => setViewMode('monthly')}
                  className="min-w-[100px]"
                  size="sm"
                >
                  Monthly Report
                </Button>
              </div>
            </div>

            {/* Year Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <span className="text-sm text-muted-foreground text-center sm:text-left">Filter by Year:</span>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                {[1, 2, 3].map((year) => (
                  <Button
                    key={year}
                    variant={selectedYear === year ? "default" : "outline"}
                    onClick={() => setSelectedYear(year)}
                    className="min-w-[70px] sm:min-w-[80px]"
                    size="sm"
                  >
                    Year {year}
                  </Button>
                ))}
              </div>
            </div>

            {viewMode === 'monthly' && (
              <>
                {/* Semester Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm text-muted-foreground text-center sm:text-left">Semester:</span>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    {semesters.map((semester) => (
                      <Button
                        key={semester.id}
                        variant={selectedSemester === semester.id ? "default" : "outline"}
                        onClick={() => {
                          setSelectedSemester(semester.id);
                          setSelectedMonth(null);
                        }}
                        className="min-w-[120px]"
                        size="sm"
                      >
                        {semester.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Month Selector (multi-select) */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <span className="text-sm text-muted-foreground text-center sm:text-left">Month:</span>
                  <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                    <Button
                      variant={selectedMonths.length === (semesters.find(s => s.id === selectedSemester)?.months.length || 0) ? "default" : "outline"}
                      onClick={() => {
                        const sem = semesters.find(s => s.id === selectedSemester);
                        if (sem) setSelectedMonths([...sem.months]);
                      }}
                      className="min-w-[100px]"
                      size="sm"
                    >
                      All Months
                    </Button>
                    {semesters.find(s => s.id === selectedSemester)?.months.map((month) => (
                      <Button
                        key={month}
                        variant={selectedMonths.includes(month) ? "default" : "outline"}
                        onClick={() => {
                          setSelectedMonths(prev => {
                            const exists = prev.includes(month);
                            if (exists) {
                              return prev.filter(m => m !== month);
                            } else {
                              return [...prev, month];
                            }
                          });
                        }}
                        className="min-w-[100px]"
                        size="sm"
                      >
                        {monthNames[month - 1]}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {viewMode === 'daily' && (
              /* Date Navigation */
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => changeDate("prev")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="text-center">
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-auto p-1">
                          <CalendarIcon className="w-5 h-5 text-primary hover:text-primary/80" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-auto p-4">
                        <DialogHeader>
                          <DialogTitle>Select Date</DialogTitle>
                        </DialogHeader>
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={(date) => {
                            if (date) {
                              setSelectedDate(date);
                              setShowCalendar(false);
                            }
                          }}
                          disabled={(date) =>
                            date > new Date() || date < new Date("2020-01-01")
                          }
                        />
                      </DialogContent>
                    </Dialog>
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
            )}
          </div>

          {/* Quick Actions - Daily View Only */}
          {viewMode === 'daily' && (
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 mt-4 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={markAllPresent}
                className="text-success hover:bg-success/10 flex-1 sm:flex-none"
              >
                <Check className="w-4 h-4 mr-1" />
                Mark All Present
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAbsent}
                className="text-destructive hover:bg-destructive/10 flex-1 sm:flex-none"
              >
                <X className="w-4 h-4 mr-1" />
                Mark All Absent
              </Button>
              <div className="flex-1 hidden sm:block" />
            </div>
          )}
        </GlassCard>

        {/* Attendance Display */}
        <GlassCard className="p-4 sm:p-6">
          {viewMode === 'daily' ? (
            /* Daily Attendance View */
            <>
              {students.length > 0 ? (
                <>
                  <div className="space-y-3 sm:space-y-2">
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
                          className={`p-3 sm:p-4 border rounded-lg ${rowBg}`}
                        >
                          <div className="flex flex-col gap-3">
                            {/* Student Info */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 sm:gap-4">
                                <p className="font-medium text-sm sm:text-base">{student.roll_number}</p>
                                <p className="text-xs sm:text-sm text-muted-foreground">{student.branch_code}</p>
                              </div>
                              <span className="text-sm sm:text-base font-semibold">
                                {periodsCounted}/{TOTAL_PERIODS}
                              </span>
                            </div>

                            {/* Period Buttons */}
                            <div className="overflow-x-auto">
                              <div className="inline-flex flex-wrap gap-1 sm:gap-1 min-w-full sm:min-w-0">
                                {periodsArray.map((isPeriodPresent, periodIndex) => (
                                  <button
                                    key={periodIndex}
                                    onClick={() => togglePeriod(student._id, periodIndex)}
                                    className={`py-1 px-2 sm:px-3 rounded text-xs font-semibold transition-all duration-200 border flex-shrink-0 ${
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

                  <div className="mt-6 pt-6 border-t border-border flex justify-center sm:justify-end">
                    <Button
                      onClick={saveAttendance}
                      disabled={saving}
                      className="btn-gradient px-6 sm:px-8 w-full sm:w-auto"
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
            </>
          ) : (
            /* Monthly Attendance Report View */
            <>
              {semesterStats ? (
                <>
                  {/* Semester Summary */}
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold mb-2">
                      {semesters.find(s => s.id === selectedSemester)?.name} Summary - Year {selectedYear}
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedMonths.length === 12
                        ? "All months"
                        : selectedMonths.map(m => monthNames[m - 1]).join(", ")}
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-muted/50 text-center">
                        <p className="text-3xl font-bold text-primary">{semesterStats.totalStudents}</p>
                        <p className="text-sm text-muted-foreground">Total Students</p>
                      </div>
                      <div className="p-4 rounded-xl bg-success/10 text-center">
                        <p className="text-3xl font-bold text-success">{semesterStats.semesterTotal.present}</p>
                        <p className="text-sm text-muted-foreground">Total Present Days</p>
                      </div>
                      <div className="p-4 rounded-xl bg-destructive/10 text-center">
                        <p className="text-3xl font-bold text-destructive">{semesterStats.semesterTotal.total - semesterStats.semesterTotal.present}</p>
                        <p className="text-sm text-muted-foreground">Total Absent Days</p>
                      </div>
                      <div className="p-4 rounded-xl bg-primary/10 text-center">
                        <p className={`text-3xl font-bold ${semesterStats.semesterTotal.averagePercentage >= 75 ? "text-success" : "text-warning"}`}>
                          {semesterStats.semesterTotal.averagePercentage}%
                        </p>
                        <p className="text-sm text-muted-foreground">Semester Average</p>
                      </div>
                    </div>
                  </div>

                  {/* Monthly Breakdown */}
                  {selectedMonth === null ? (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Monthly Breakdown</h3>
                      {Object.entries(semesterStats.monthlyStats).map(([month, stats]: [string, any]) => (
                        <div key={month} className="p-4 border rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium">{stats.monthName}</h4>
                            <span className="text-sm text-muted-foreground">
                              {stats.averagePercentage}% average attendance
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {students.map((student) => {
                              const studentStats = stats.studentStats[student._id];
                              return (
                                <div key={student._id} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                  <span className="text-sm font-medium">{student.roll_number}</span>
                                  <span className={`text-sm font-semibold ${
                                    studentStats?.percentage >= 75 ? "text-success" :
                                    studentStats?.percentage >= 50 ? "text-warning" : "text-destructive"
                                  }`}>
                                    {studentStats?.percentage || 0}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Single Month View */
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">
                        {monthNames[selectedMonth - 1]} Detailed Report
                      </h3>
                      {semesterStats.monthlyStats[selectedMonth] && (
                        <div className="space-y-3">
                          {students.map((student) => {
                            const studentStats = semesterStats.monthlyStats[selectedMonth].studentStats[student._id];
                            return (
                              <div
                                key={student._id}
                                className={`p-4 border rounded-lg ${
                                  studentStats?.percentage >= 75 ? "bg-success/5" :
                                  studentStats?.percentage >= 50 ? "bg-warning/5" : "bg-destructive/5"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <span className="font-medium">{student.roll_number}</span>
                                    <span className="text-sm text-muted-foreground">{student.branch_code}</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-lg font-bold">
                                      {studentStats?.percentage || 0}%
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {studentStats?.present || 0}/{studentStats?.total || 0} days
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No data available</h3>
                  <p className="text-muted-foreground">
                    No attendance data found for the selected period
                  </p>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultyAttendance;
