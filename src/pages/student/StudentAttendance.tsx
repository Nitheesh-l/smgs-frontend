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
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, Check, X } from "lucide-react";

interface AttendanceRecord {
  id: string;
  date: string;
  month: number;
  year: number;
  status: string;
  periods_present: number;
  total_periods: number;
}

const StudentAttendance = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [viewMode, setViewMode] = useState<'monthly' | 'semester'>('monthly');
  const [selectedSemester, setSelectedSemester] = useState<number>(1);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [semesterStats, setSemesterStats] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "student")) {
      navigate("/auth?type=student");
    }
  }, [profile, authLoading, navigate]);

  useEffect(() => {
    const fetchStudentId = async () => {
      if (!profile) return;

      try {
        const { res, data } = await fetchJson(`/api/students?profile_id=${encodeURIComponent(profile.id)}`);
        if (res.ok) {
          const student = Array.isArray(data) ? data[0] : data;
          if (student) setStudentId(student.id || student._id || null);
        }
      } catch (error) {
        console.error("Error fetching student ID:", error);
      }
    };

    if (profile?.role === "student") {
      fetchStudentId();
    }
  }, [profile]);

  const fetchSemesterAttendance = async () => {
    if (!studentId) return;
    setLoading(true);

    try {
      const currentSemester = semesters.find(s => s.id === selectedSemester);
      if (!currentSemester) return;

      const semesterData: any = {
        semester: currentSemester.name,
        year: selectedYear,
        monthlyStats: {},
        semesterTotal: { present: 0, total: 0 }
      };

      // determine which months to include (selectedMonths overrides full semester)
      const monthsToFetch = selectedMonths.length > 0 ? selectedMonths : currentSemester.months;
      // Fetch attendance for each chosen month
      for (const month of monthsToFetch) {
        const params = new URLSearchParams();
        params.set('student_id', studentId);
        params.set('month', String(month));
        params.set('year', selectedYear);

        const { res, data } = await fetchJson(`/api/attendance?${params.toString()}`);
        if (res.ok) {
          const monthAttendance = Array.isArray(data) ? data : data?.data || [];
          const presentDays = monthAttendance.filter((r: any) => r.status === 'Present' || r.status === 'Half Day').length;
          const totalDays = monthAttendance.length;
          const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

          semesterData.monthlyStats[month] = {
            month,
            monthName: monthNames[month - 1],
            present: presentDays,
            total: totalDays,
            percentage,
            records: monthAttendance
          };

          semesterData.semesterTotal.present += presentDays;
          semesterData.semesterTotal.total += totalDays;
        }
      }

      semesterData.semesterTotal.percentage =
        semesterData.semesterTotal.total > 0
          ? Math.round((semesterData.semesterTotal.present / semesterData.semesterTotal.total) * 100)
          : 0;

      setSemesterStats(semesterData);
    } catch (error) {
      console.error("Error fetching semester attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // reset selected months when semester changes
  useEffect(() => {
    const sem = semesters.find(s => s.id === selectedSemester);
    if (sem) {
      setSelectedMonths([...sem.months]);
    }
  }, [selectedSemester]);

  // sync single month detail view
  useEffect(() => {
    if (selectedMonths.length === 1) {
      setSelectedMonth(String(selectedMonths[0]));
    } else {
      // keep month value for monthly mode only
      if (viewMode === 'semester') setSelectedMonth("");
    }
  }, [selectedMonths, viewMode]);

  useEffect(() => {
    if (viewMode === 'monthly') {
      const fetchAttendance = async () => {
        if (!studentId) return;
        setLoading(true);

        try {
          const params = new URLSearchParams();
          params.set('student_id', studentId);
          params.set('month', String(Number(selectedMonth)));
          params.set('year', String(Number(selectedYear)));
          
          const { res, data } = await fetchJson(`/api/attendance?${params.toString()}`);
          if (res.ok) {
            const attendanceData = Array.isArray(data) ? data : data?.data || [];
            setAttendance(
              attendanceData.map((d: any) => ({
                id: d._id || d.id,
                date: d.date,
                month: d.month,
                year: d.year,
                status: d.status || 'Absent',
                periods_present: d.periods_present || 0,
                total_periods: d.total_periods || 7,
              }))
            );
          }
        } catch (error) {
          console.error("Error fetching attendance:", error);
        } finally {
          setLoading(false);
        }
      };

      if (studentId) {
        fetchAttendance();
      }
    } else {
      fetchSemesterAttendance();
    }
  }, [studentId, selectedMonth, selectedYear, viewMode, selectedSemester, selectedMonths]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Semester configuration
  const semesters = [
    { id: 1, name: "1st Year - Semester 1", months: [7, 8, 9, 10, 11, 12] },
    { id: 2, name: "1st Year - Semester 2", months: [1, 2, 3, 4, 5, 6] },
    { id: 3, name: "2nd Year - Semester 3", months: [7, 8, 9, 10, 11, 12] },
    { id: 4, name: "2nd Year - Semester 4", months: [1, 2, 3, 4, 5, 6] },
    { id: 5, name: "3rd Year - Semester 5", months: [7, 8, 9, 10, 11, 12] },
    { id: 6, name: "3rd Year - Semester 6", months: [1, 2, 3, 4, 5, 6] },
  ];

  const presentDays = attendance.filter((a) => a.status === 'Present' || a.status === 'Half Day').length;
  const totalDays = attendance.length;
  const percentage = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

  const part1Records = attendance.filter((a) => {
    const day = new Date(a.date).getDate();
    return day <= 15;
  });

  const part2Records = attendance.filter((a) => {
    const day = new Date(a.date).getDate();
    return day > 15;
  });

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
          <h1 className="text-3xl font-bold mb-2">
            {viewMode === 'monthly' ? 'Monthly Attendance Record' : 'Semester Attendance Report'}
          </h1>
          <p className="text-muted-foreground">
            {viewMode === 'monthly' ? 'View your monthly attendance details' : 'View your semester attendance summary'}
          </p>
        </div>

        {/* Controls */}
        <GlassCard className="p-6 mb-6">
          <div className="space-y-4">
            {/* View Mode Selector */}
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-medium">View Mode:</span>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === 'monthly' ? "default" : "outline"}
                  onClick={() => setViewMode('monthly')}
                  size="sm"
                >
                  Monthly View
                </Button>
                <Button
                  variant={viewMode === 'semester' ? "default" : "outline"}
                  onClick={() => setViewMode('semester')}
                  size="sm"
                >
                  Semester Report
                </Button>
              </div>
            </div>

            {viewMode === 'semester' && (
              <>
                {/* Semester and Year Selector */}
                <div className="flex flex-wrap items-center gap-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">Select Semester:</span>
                  <Select value={String(selectedSemester)} onValueChange={(value) => setSelectedSemester(Number(value))}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((semester) => (
                        <SelectItem key={semester.id} value={String(semester.id)}>
                          {semester.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Month multi-selector for semester */}
                <div className="flex flex-wrap items-center gap-4 mt-4">
                  <span className="font-medium">Select Months:</span>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={selectedMonths.length === (semesters.find(s => s.id === selectedSemester)?.months.length || 0) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const sem = semesters.find(s => s.id === selectedSemester);
                        if (sem) setSelectedMonths([...sem.months]);
                      }}
                    >
                      All
                    </Button>
                    {semesters.find(s => s.id === selectedSemester)?.months.map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={selectedMonths.includes(m) ? "default" : "outline"}
                        onClick={() => {
                          setSelectedMonths(prev => {
                            if (prev.includes(m)) return prev.filter(x => x !== m);
                            return [...prev, m];
                          });
                        }}
                      >
                        {monthNames[m - 1]}
                      </Button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {viewMode === 'monthly' && (
              <>
                {/* Month/Year Selector */}
                <div className="flex flex-wrap items-center gap-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-medium">Select Period:</span>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((month, index) => (
                        <SelectItem key={index} value={String(index + 1)}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[2024, 2025, 2026].map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
        </GlassCard>

        {/* Attendance Display */}
        {viewMode === 'monthly' ? (
          <>
            {/* Monthly Attendance Summary */}
            <GlassCard className="p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {monthNames[Number(selectedMonth) - 1]} {selectedYear} Summary
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 text-center">
                  <p className="text-3xl font-bold text-primary">{totalDays}</p>
                  <p className="text-sm text-muted-foreground">Total Days</p>
                </div>
                <div className="p-4 rounded-xl bg-success/10 text-center">
                  <p className="text-3xl font-bold text-success">{presentDays}</p>
                  <p className="text-sm text-muted-foreground">Present</p>
                </div>
                <div className="p-4 rounded-xl bg-destructive/10 text-center">
                  <p className="text-3xl font-bold text-destructive">{totalDays - presentDays}</p>
                  <p className="text-sm text-muted-foreground">Absent</p>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 text-center">
                  <p className={`text-3xl font-bold ${percentage >= 75 ? "text-success" : "text-warning"}`}>
                    {percentage}%
                  </p>
                  <p className="text-sm text-muted-foreground">Percentage</p>
                </div>
              </div>
            </GlassCard>

            {loading ? (
              <GlassCard className="p-8">
                <Loader text="Loading attendance..." />
              </GlassCard>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Part 1: Dates 1-15 */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Part 1 (Dates 1-15)
                  </h3>
                  {part1Records.length > 0 ? (
                    <div className="space-y-2">
                      {part1Records.map((record) => (
                        <div
                          key={record.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            record.status === 'Present' || record.status === 'Half Day' ? "bg-success/10" : "bg-destructive/10"
                          }`}
                        >
                          <span className="font-medium">
                            {new Date(record.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                            })}
                          </span>
                          {record.status === 'Present' ? (
                            <span className="flex items-center gap-1 text-success text-sm">
                              <Check className="w-4 h-4" />
                              Present
                            </span>
                          ) : record.status === 'Half Day' ? (
                            <span className="flex items-center gap-1 text-warning text-sm">
                              <Check className="w-4 h-4" />
                              Half Day
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive text-sm">
                              <X className="w-4 h-4" />
                              Absent
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No records for this period
                    </p>
                  )}
                </GlassCard>

                {/* Part 2: Dates 16-30/31 */}
                <GlassCard className="p-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Part 2 (Dates 16-30/31)
                  </h3>
                  {part2Records.length > 0 ? (
                    <div className="space-y-2">
                      {part2Records.map((record) => (
                        <div
                          key={record.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${
                            record.status === 'Present' || record.status === 'Half Day' ? "bg-success/10" : "bg-destructive/10"
                          }`}
                        >
                          <span className="font-medium">
                            {new Date(record.date).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                            })}
                          </span>
                          {record.status === 'Present' ? (
                            <span className="flex items-center gap-1 text-success text-sm">
                              <Check className="w-4 h-4" />
                              Present
                            </span>
                          ) : record.status === 'Half Day' ? (
                            <span className="flex items-center gap-1 text-warning text-sm">
                              <Check className="w-4 h-4" />
                              Half Day
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-destructive text-sm">
                              <X className="w-4 h-4" />
                              Absent
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No records for this period
                    </p>
                  )}
                </GlassCard>
              </div>
            )}
          </>
        ) : (
          /* Semester Attendance Report */
          <>
            {loading ? (
              <GlassCard className="p-8">
                <Loader text="Loading semester attendance..." />
              </GlassCard>
            ) : semesterStats ? (
              <>
                {/* Semester Summary */}
                <GlassCard className="p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-2">
                    {semesterStats.semester} {semesterStats.year} Summary
                  </h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedMonths.length === 12
                      ? "All months"
                      : selectedMonths.map(m => monthNames[m - 1]).join(", ")}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 text-center">
                      <p className="text-3xl font-bold text-primary">{semesterStats.semesterTotal.total}</p>
                      <p className="text-sm text-muted-foreground">Total Days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-success/10 text-center">
                      <p className="text-3xl font-bold text-success">{semesterStats.semesterTotal.present}</p>
                      <p className="text-sm text-muted-foreground">Present Days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-destructive/10 text-center">
                      <p className="text-3xl font-bold text-destructive">{semesterStats.semesterTotal.total - semesterStats.semesterTotal.present}</p>
                      <p className="text-sm text-muted-foreground">Absent Days</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/10 text-center">
                      <p className={`text-3xl font-bold ${semesterStats.semesterTotal.percentage >= 75 ? "text-success" : "text-warning"}`}>
                        {semesterStats.semesterTotal.percentage}%
                      </p>
                      <p className="text-sm text-muted-foreground">Semester Average</p>
                    </div>
                  </div>
                </GlassCard>

                {/* Monthly Breakdown */}
                <GlassCard className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Monthly Attendance Breakdown</h3>
                  <div className="space-y-4">
                    {Object.entries(semesterStats.monthlyStats).map(([month, stats]: [string, any]) => (
                      <div key={month} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium">{stats.monthName}</h4>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {stats.percentage}%
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {stats.present}/{stats.total} days
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              stats.percentage >= 75 ? "bg-success" :
                              stats.percentage >= 50 ? "bg-warning" : "bg-destructive"
                            }`}
                            style={{ width: `${stats.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </GlassCard>
              </>
            ) : (
              <GlassCard className="p-8">
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="text-lg font-medium mb-2">No semester data available</h3>
                  <p className="text-muted-foreground">
                    No attendance data found for the selected semester
                  </p>
                </div>
              </GlassCard>
            )}
          </>
        )}
      </PageWrapper>
    </>
  );
};

export default StudentAttendance;
