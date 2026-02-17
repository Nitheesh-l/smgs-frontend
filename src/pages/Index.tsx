import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import { GraduationCap, Users, BookOpen, Calendar,ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen mesh-gradient overflow-hidden">
      {/* Hero Section */}
      <div className="relative">
        {/* Floating decorative elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute top-40 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float delay-200" />
        <div className="absolute bottom-20 left-1/3 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-float delay-500" />

        <div className="relative max-w-7xl mx-auto px-4 pt-20 pb-32">
          {/* Logo and Title */}
          <div className="text-center fade-in-up">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-primary shadow-glow mb-6 pulse-glow">
              <GraduationCap className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-gradient">Student</span> Management
              <br />
              <span className="text-foreground">System</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              A modern, elegant portal for faculty and students to manage attendance,
              marks, and academic records seamlessly.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth?type=faculty">
                <Button className="btn-gradient px-8 py-6 text-lg rounded-2xl group">
                  Faculty Login
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/auth?type=student">
                <Button
                  variant="outline"
                  className="px-8 py-6 text-lg rounded-2xl border-2 hover:bg-muted group"
                >
                  Student Login
                  <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-24 stagger-children">
            <GlassCard hover className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Student Management</h3>
              <p className="text-muted-foreground">
                Faculty can easily add, edit, and manage student profiles with complete details.
              </p>
            </GlassCard>

            <GlassCard hover className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Attendance Tracking</h3>
              <p className="text-muted-foreground">
                Monthly attendance management with split periods and real-time percentage calculation.
              </p>
            </GlassCard>

            <GlassCard hover className="p-8">
              <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center mb-4">
                <BookOpen className="w-7 h-7 text-success" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Marks Management</h3>
              <p className="text-muted-foreground">
                Comprehensive exam tracking including unit tests, internals, externals, and lab exams.
              </p>
            </GlassCard>
          </div>

          {/* Badge */}
          <div className="flex justify-center mt-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border shadow-sm">
              <Sparkles className="w-4 h-4 text-primary" />
              <ArrowLeft className="text-primary opacity-50"/><Sparkles className="w-4 h-4 text-primary" />
              <Sparkles className="w-4 h-4 text-primary" />
              <Sparkles className="w-4 h-4 text-primary" /><ArrowRight className="text-primary opacity-50"/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
