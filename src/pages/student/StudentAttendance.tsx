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

  useEffect(() => {
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
  }, [studentId, selectedMonth, selectedYear]);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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
          <h1 className="text-3xl font-bold mb-2">Attendance Record</h1>
          <p className="text-muted-foreground">
            View your monthly attendance details
          </p>
        </div>

        {/* Month/Year Selector */}
        <GlassCard className="p-6 mb-6">
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
        </GlassCard>

        {/* Attendance Summary */}
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
      </PageWrapper>
    </>
  );
};

export default StudentAttendance;
