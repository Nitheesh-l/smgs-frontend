import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GlassNav from "@/components/layout/GlassNav";
import PageWrapper from "@/components/layout/PageWrapper";
import StatCard from "@/components/ui/StatCard";
import GlassCard from "@/components/ui/GlassCard";
import Loader from "@/components/ui/Loader";
import { useAuth } from "@/hooks/useAuth";
import { fetchJson } from "@/utils/api";
import { Users, Calendar, BookOpen, TrendingUp, UserPlus, ClipboardCheck, Plus, Bell, MessageSquare, Trash2, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const FacultyDashboard = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(1);

  // Notifications state
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [notificationForm, setNotificationForm] = useState({
    title: "",
    content: "",
    target_year: "0",
    type: "announcement",
    url: "",
  });

  // Links state
  const [links, setLinks] = useState<any[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({
    title: "",
    description: "",
    url: "",
  });

  const [promotionLoading, setPromotionLoading] = useState(false);

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

  const fetchNotifications = async () => {
    try {
      setNotificationsLoading(true);
      const { res, data } = await fetchJson("/api/notifications");
      if (res.ok) {
        setNotifications(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setNotificationsLoading(false);
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
    setLoading(true);
    fetchStats(selectedYear);
    fetchNotifications();
    fetchLinks();
  }, [selectedYear]);

  // Notification handlers
  const handleAddNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationForm.title.trim() || !notificationForm.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...notificationForm,
          created_by: profile?.full_name,
          created_by_role: 'faculty'
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to add notification");
        return;
      }

      toast.success("Notification added successfully");
      setNotifications(prev => [data.notification, ...prev]);
      setNotificationForm({ title: "", content: "", target_year: "0", type: "announcement", url: "" });
      setShowNotificationForm(false);
    } catch (error) {
      console.error("Add notification error:", error);
      toast.error("Failed to add notification");
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data?.error || "Failed to delete notification");
        return;
      }

      toast.success("Notification deleted successfully");
      setNotifications(prev => prev.filter(notification => notification._id !== notificationId));
    } catch (error) {
      console.error("Delete notification error:", error);
      toast.error("Failed to delete notification");
    }
  };

  // Link handlers
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

      toast.success("Link added successfully");
      setLinks(prev => [data.link, ...prev]);
      setLinkForm({ title: "", description: "", url: "" });
      setShowLinkForm(false);
    } catch (error) {
      console.error("Add link error:", error);
      toast.error("Failed to add link");
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm("Are you sure you want to delete this link?")) return;

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

      toast.success("Link deleted successfully");
      setLinks(prev => prev.filter(link => link._id !== linkId));
    } catch (error) {
      console.error("Delete link error:", error);
      toast.error("Failed to delete link");
    }
  };

  // Promotion handler
  const handlePromoteStudents = async (fromYear: number, toYear: number, batch: string) => {
    if (!confirm(`Are you sure you want to promote students from Year ${fromYear} to ${toYear === 4 ? 'Passout' : `Year ${toYear}`} with batch ${batch}?`)) {
      return;
    }

    setPromotionLoading(true);
    try {
      const { res, data } = await fetchJson('/api/students/promote', {
        method: 'POST',
        body: JSON.stringify({
          from_year: fromYear,
          to_year: toYear,
          batch: batch
        })
      });

      if (!res.ok) {
        toast.error(data?.error || 'Failed to promote students');
        return;
      }

      toast.success(data.message);
      // Refresh stats to show updated counts
      fetchStats(selectedYear);
    } catch (error) {
      console.error('Promotion error:', error);
      toast.error('Failed to promote students');
    } finally {
      setPromotionLoading(false);
    }
  };

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
        <div className="mb-6 sm:mb-8 mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Welcome back, <span className="text-gradient">{profile?.full_name}</span>
          </h1>
          
        </div>

        {/* Year Selector */}
        <div className="mb-8 flex flex-wrap gap-2 sm:gap-4">
          <p className="text-muted-foreground font-medium flex items-center text-sm sm:text-base">Filter by Year:</p>
          {[1, 2, 3].map((year) => (
            <Button
              key={year}
              variant={selectedYear === year ? "default" : "outline"}
              onClick={() => setSelectedYear(year)}
              className="min-w-[70px] sm:min-w-[80px] text-sm"
              size="sm"
            >
              Year {year}
            </Button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <StatCard
            title={`Total Students (Year ${selectedYear})`}
            value={stats?.totalStudents || 0}
            icon={<Users className="w-6 h-6" />}
            variant="primary"
          />
          <StatCard
            title={`Present Today (Year ${selectedYear})`}
            value={stats?.attendanceToday || 0}
            icon={<Calendar className="w-6 h-6" />}
            variant="success"
          />
          <StatCard
            title={`Avg Attendance (Year ${selectedYear})`}
            value={`${stats?.avgAttendance || 0}%`}
            icon={<TrendingUp className="w-6 h-6" />}
            variant="accent"
          />
          <StatCard
            title={`Subjects (Year ${selectedYear})`}
            value={stats?.totalSubjects || 0}
            icon={<BookOpen className="w-6 h-6" />}
            variant="warning"
          />
        </div>

        {/* Quick Actions & Recent Students */}
        <div className="grid gap-6">
          {/* Quick Actions */}
          <GlassCard className="p-4 sm:p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
              <Link to="/faculty/students">
                <div className="p-3 sm:p-4 rounded-xl bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer group">
                  <UserPlus className="w-6 sm:w-8 h-6 sm:h-8 text-primary mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm sm:text-base">Add Student</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Register new student</p>
                </div>
              </Link>
              <Link to="/faculty/attendance">
                <div className="p-3 sm:p-4 rounded-xl bg-success/5 border border-success/20 hover:bg-success/10 transition-colors cursor-pointer group">
                  <ClipboardCheck className="w-6 sm:w-8 h-6 sm:h-8 text-success mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm sm:text-base">Mark Attendance</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Today's attendance</p>
                </div>
              </Link>
              <Link to="/faculty/marks">
                <div className="p-3 sm:p-4 rounded-xl bg-accent/5 border border-accent/20 hover:bg-accent/10 transition-colors cursor-pointer group">
                  <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-accent mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm sm:text-base">Enter Marks</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Exam marks entry</p>
                </div>
              </Link>
              <Link to="/faculty/subjects">
                <div className="p-3 sm:p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group">
                  <BookOpen className="w-6 sm:w-8 h-6 sm:h-8 text-warning mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm sm:text-base">Subjects</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">View or add subjects</p>
                </div>
              </Link>
              <Link to="/faculty/students">
                <div className="p-3 sm:p-4 rounded-xl bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors cursor-pointer group col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                  <Users className="w-6 sm:w-8 h-6 sm:h-8 text-warning mb-2 group-hover:scale-110 transition-transform" />
                  <p className="font-medium text-sm sm:text-base">View Students</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Manage students</p>
                </div>
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Notifications & Assignments Section */}
        <GlassCard className="p-4 sm:p-6 mt-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-xl font-semibold">Notifications & Links</h2>
              <p className="text-muted-foreground text-sm">Post announcements, assignments, and share resources with your students</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                onClick={() => setShowNotificationForm(!showNotificationForm)}
                className="bg-purple-600 hover:bg-purple-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Notification
              </Button>
              <Button
                onClick={() => setShowLinkForm(!showLinkForm)}
                className="bg-green-600 hover:bg-green-700"
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Link
              </Button>
            </div>
          </div>

          {/* Add Notification Form */}
          {showNotificationForm && (
            <GlassCard className="p-4 mb-6 border-purple-200 bg-purple-50/50">
              <h3 className="text-lg font-semibold mb-4">Add New Notification</h3>
              <form onSubmit={handleAddNotification} className="space-y-4">
                <div>
                  <Label htmlFor="notificationTitle" className="text-sm font-medium">
                    Title
                  </Label>
                  <Input
                    id="notificationTitle"
                    value={notificationForm.title}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter notification title"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="notificationContent" className="text-sm font-medium">
                    Content
                  </Label>
                  <Textarea
                    id="notificationContent"
                    value={notificationForm.content}
                    onChange={(e) => setNotificationForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Enter notification content or assignment details"
                    className="mt-1"
                    rows={4}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Target Audience</Label>
                  <Select
                    value={notificationForm.target_year}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, target_year: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select target audience" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">All Years</SelectItem>
                      <SelectItem value="1">Year 1 Only</SelectItem>
                      <SelectItem value="2">Year 2 Only</SelectItem>
                      <SelectItem value="3">Year 3 Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium">Type</Label>
                  <Select
                    value={notificationForm.type}
                    onValueChange={(value) => setNotificationForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="announcement">Announcement</SelectItem>
                      <SelectItem value="assignment">Assignment</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="reminder">Reminder</SelectItem>
                      <SelectItem value="link">Link/Resource</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {notificationForm.type === "link" && (
                  <div>
                    <Label htmlFor="notificationUrl" className="text-sm font-medium">
                      URL (optional)
                    </Label>
                    <Input
                      id="notificationUrl"
                      type="url"
                      value={notificationForm.url || ""}
                      onChange={(e) => setNotificationForm(prev => ({ ...prev, url: e.target.value }))}
                      placeholder="https://example.com or leave empty for content-only"
                      className="mt-1"
                    />
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Add Notification
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowNotificationForm(false);
                      setNotificationForm({ title: "", content: "", target_year: "0", type: "announcement", url: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </GlassCard>
          )}

          {/* Add Link Form */}
          {showLinkForm && (
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
                <div className="flex flex-col sm:flex-row gap-3">
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
          )}

          {/* Notifications List */}
          {notificationsLoading ? (
            <div className="flex justify-center py-8">
              <Loader size="md" text="Loading notifications..." />
            </div>
          ) : notifications.length > 0 ? (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div key={notification._id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h4 className="font-semibold break-words">{notification.title}</h4>
                        <Badge variant="outline" className="text-xs shrink-0">
                          {notification.type}
                        </Badge>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {notification.target_year === "0" ? "All Years" : `Year ${notification.target_year}`}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground break-words">{notification.content}</p>
                      {notification.url && (
                        <a
                          href={notification.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-flex items-center gap-1 break-all"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{notification.url}</span>
                        </a>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Posted on {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteNotification(notification._id)}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 self-start sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No notifications yet</p>
          )}

          {/* Links List */}
          <div className="mt-8 pt-8 border-t border-border">
            <h3 className="text-lg font-semibold mb-4">Links & Resources</h3>
            {linksLoading ? (
              <div className="flex justify-center py-8">
                <Loader size="md" text="Loading links..." />
              </div>
            ) : links.length > 0 ? (
              <div className="space-y-4">
                {links.map((link) => (
                  <div key={link._id} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold break-words">{link.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{link.description}</p>
                        {link.url && (
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-700 mt-2 inline-flex items-center gap-1 break-all "
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate sm:text-wrap">Link</span>
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
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0 self-start sm:self-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No links yet</p>
            )}
          </div>
        </GlassCard>

        {/* Student Promotion Section */}
        <GlassCard className="p-4 sm:p-6 mt-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Student Promotion</h2>
            <p className="text-muted-foreground text-sm">Promote students to next year or mark final year students as passout</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {/* Year 1 to Year 2 */}
            <div className="p-4 border border-border rounded-lg bg-blue-50/50">
              <h3 className="font-semibold mb-2 text-blue-700">Year 1 → Year 2</h3>
              <p className="text-sm text-muted-foreground mb-4">Promote current 1st year students to 2nd year (2025-2028 batch)</p>
              <Button
                onClick={() => handlePromoteStudents(1, 2, '2025-2028')}
                disabled={promotionLoading}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                {promotionLoading ? 'Processing...' : 'Promote to Year 2'}
              </Button>
            </div>

            {/* Year 2 to Year 3 */}
            <div className="p-4 border border-border rounded-lg bg-green-50/50">
              <h3 className="font-semibold mb-2 text-green-700">Year 2 → Year 3</h3>
              <p className="text-sm text-muted-foreground mb-4">Promote current 2nd year students to 3rd year (2024-2027 batch)</p>
              <Button
                onClick={() => handlePromoteStudents(2, 3, '2024-2027')}
                disabled={promotionLoading}
                className="w-full bg-green-600 hover:bg-green-700"
                size="sm"
              >
                {promotionLoading ? 'Processing...' : 'Promote to Year 3'}
              </Button>
            </div>

            {/* Year 3 to Passout */}
            <div className="p-4 border border-border rounded-lg bg-orange-50/50">
              <h3 className="font-semibold mb-2 text-orange-700">Year 3 → Passout</h3>
              <p className="text-sm text-muted-foreground mb-4">Mark final year students as passout (2023-2026 batch)</p>
              <Button
                onClick={() => handlePromoteStudents(3, 4, '2023-2026')}
                disabled={promotionLoading}
                className="w-full bg-orange-600 hover:bg-orange-700"
                size="sm"
              >
                {promotionLoading ? 'Processing...' : 'Mark as Passout'}
              </Button>
            </div>
          </div>

          {/* <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• April 2026: Final year students (Year 3) will be marked as passout with batch 2023-2026</li>
              <li>• May 2026: Year 2 students promoted to Year 3 with batch 2024-2027</li>
              <li>• May 2026: Year 1 students promoted to Year 2 with batch 2025-2028</li>
              <li>• This action cannot be undone. Make sure to backup data before proceeding.</li>
            </ul>
          </div> */}
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultyDashboard;
