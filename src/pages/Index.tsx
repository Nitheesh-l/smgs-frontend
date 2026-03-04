import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/ui/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import { GraduationCap, Users, BookOpen, Calendar,ArrowLeft, ArrowRight, Sparkles } from "lucide-react";

const Index = () => {
  const { profile, loading } = useAuth();

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
              
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="text-gradient">Student </span> Attendance & Academic
              <br />
              <span className="text-foreground"><span className="text-gradient">Management </span> System</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-12">
              Welcome to Dharmavaram Polytechnic College
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

          

        </div>
      </div>
    </div>
  );
};

export default Index;
