import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/hooks/useAuth";
import { fetchJson } from "@/utils/api";
import { Users, Calendar, BookOpen, TrendingUp, UserPlus, ClipboardCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const FacultyDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(1);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  const fetchStats = async (year: number) => {
    try {
      const { res, data } = await fetchJson(`/api/stats?year=${year}`);

      if (!res.ok) {
        toast.error(data?.error || "Failed to fetch stats");
        return;
      }

      setStats(data);
      // fetch recent students to display with names
      try {
        const { res: sres, data: sdata } = await fetchJson(`/api/students?year_of_study=${year}`);
        if (sres.ok) {
          const arr = Array.isArray(sdata) ? sdata : [];
          setRecentStudents(arr.slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to fetch recent students', err);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStats(selectedYear);
  }, [selectedYear]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="faculty" userName={profile?.full_name} />
      <PageWrapper>
        {/* Welcome Section */}
        <div className="mb-8 mt-4">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, <span className="text-gradient">{profile?.full_name}</span>
          </h1>
          
        </div>

        {/* Year Selector */}
        <div className="mb-8 flex gap-4">
          <p className="text-muted-foreground font-medium flex items-center">Filter by Year:</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={`Total Students (Year ${selectedYear})`}
            value={stats.totalStudents}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title={`Present Today (Year ${selectedYear})`}
            value={stats.attendanceToday}
            icon={<Calendar className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title={`Avg Attendance (Year ${selectedYear})`}
            value={`${stats.avgAttendance}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title={`Subjects (Year ${selectedYear})`}
            value={stats.totalSubjects}
            icon={<BookOpen className="w-6 h-6" />}
            variant="warning"
          />
        </div>

        {/* Quick Actions & Recent Students */}
        <div className="grid gap-6">
          {/* Quick Actions */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/faculty/students">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer group">
                  <UserPlus className="w-8 h-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">Add Student</p>
                  <p className="text-sm text-muted-foreground">Register new student</p>
                </div>
              </Link>
              <Link to="/faculty/attendance">
                <div className="p-4 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors cursor-pointer group">
                  <ClipboardCheck className="w-8 h-8 text-success mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">Mark Attendance</p>
                  <p className="text-sm text-muted-foreground">Today's attendance</p>
                </div>
              </Link>
              <Link to="/faculty/marks">
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors cursor-pointer group">
                  <BookOpen className="w-8 h-8 text-accent mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">Enter Marks</p>
                  <p className="text-sm text-muted-foreground">Exam marks entry</p>
                </div>
              </Link>
              <Link to="/faculty/subjects">
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group">
                  <BookOpen className="w-8 h-8 text-warning mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">Subjects</p>
                  <p className="text-sm text-muted-foreground">View or add subjects</p>
                </div>
              </Link>
              <Link to="/faculty/students">
                <div className="p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group">
                  <Users className="w-8 h-8 text-warning mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium">View Students</p>
                  <p className="text-sm text-muted-foreground">Manage students</p>
                </div>
              </Link>
            </div>
          </GlassCard>
        </div>
      </PageWrapper>
    </>
  );
};

export default FacultyDashboard;
