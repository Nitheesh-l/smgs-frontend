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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Filter, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Subject {
  _id: string;
  code: string;
  name: string;
  semester: number;
  branch_code: string;
  type: string;
  marks: any;
}

const FacultySubjects = () => {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // filters
  const [selectedYear, setSelectedYear] = useState(1);
  const [selectedSemester, setSelectedSemester] = useState(1);
  const [selectedBranch, setSelectedBranch] = useState("DCME");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({
    code: "",
    name: "",
    semester: selectedSemester,
    branch_code: selectedBranch,
    type: "theory",
    ut: 20,
    external: 80,
    sessional: 40,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!profile || profile.role !== "faculty")) {
      navigate("/auth?type=faculty");
    }
  }, [profile, authLoading, navigate]);

  const fetchSubjects = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("semester", String(selectedSemester));
      params.set("branch_code", selectedBranch);

      const { res, data } = await fetchJson(`/api/subjects?${params.toString()}`);
      if (res.ok) {
        setSubjects(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading subjects", err);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // compute semester from year when year changes
    const sem = (selectedYear - 1) * 2 + 1;
    setSelectedSemester(sem);
  }, [selectedYear]);

  // Update year when semester changes
  useEffect(() => {
    const newYear = Math.ceil(selectedSemester / 2);
    setSelectedYear(newYear);
  }, [selectedSemester]);

  useEffect(() => {
    fetchSubjects();
  }, [selectedSemester, selectedBranch]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader size="lg" text="Loading subjects..." />
      </div>
    );
  }

  return (
    <>
      <GlassNav role="faculty" userName={profile?.full_name} />
      <PageWrapper>
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Subjects</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="btn-gradient rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Subject</DialogTitle>
                <DialogDescription>
                  Create a subject for the selected semester and branch.
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setSubmitting(true);
                  try {
                    const payload: any = {
                      code: subjectForm.code,
                      name: subjectForm.name,
                      semester: Number(subjectForm.semester),
                      branch_code: subjectForm.branch_code,
                      type: subjectForm.type,
                      marks:
                        subjectForm.type === "lab"
                          ? { sessional: Number(subjectForm.sessional), external: Number(subjectForm.external) }
                          : { ut: Number(subjectForm.ut), external: Number(subjectForm.external) },
                      created_by: profile?.id,
                    };

                    const { res, data } = await fetchJson("/api/subjects", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });

                    if (!res.ok) {
                      toast.error(data?.error || "Failed to create subject");
                      return;
                    }

                    toast.success("Subject created");
                    setIsDialogOpen(false);
                    setSubjectForm({ code: "", name: "", semester: selectedSemester, branch_code: selectedBranch, type: "theory", ut: 20, external: 80, sessional: 40 });
                    fetchSubjects();
                  } catch (error) {
                    console.error("Error creating subject:", error);
                    toast.error("Failed to create subject");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                className="space-y-4 mt-4"
              >
                <div>
                  <Label>Code</Label>
                  <Input value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>Name</Label>
                  <Input value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Semester</Label>
                    <Select value={String(subjectForm.semester)} onValueChange={(v) => setSubjectForm({ ...subjectForm, semester: Number(v) })}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5,6].map((s) => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Branch</Label>
                    <Input value={subjectForm.branch_code} onChange={(e) => setSubjectForm({ ...subjectForm, branch_code: e.target.value })} className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={subjectForm.type} onValueChange={(v: any) => setSubjectForm({ ...subjectForm, type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theory">Theory</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {subjectForm.type === "lab" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sessional</Label>
                      <Input type="number" value={String(subjectForm.sessional)} onChange={(e) => setSubjectForm({ ...subjectForm, sessional: Number(e.target.value) })} className="mt-1" />
                    </div>
                    <div>
                      <Label>External</Label>
                      <Input type="number" value={String(subjectForm.external)} onChange={(e) => setSubjectForm({ ...subjectForm, external: Number(e.target.value) })} className="mt-1" />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Unit Test (UT)</Label>
                      <Input type="number" value={String(subjectForm.ut)} onChange={(e) => setSubjectForm({ ...subjectForm, ut: Number(e.target.value) })} className="mt-1" />
                    </div>
                    <div>
                      <Label>External</Label>
                      <Input type="number" value={String(subjectForm.external)} onChange={(e) => setSubjectForm({ ...subjectForm, external: Number(e.target.value) })} className="mt-1" />
                    </div>
                  </div>
                )}
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" disabled={submitting || !subjectForm.code || !subjectForm.name} className="flex-1 btn-gradient">
                    {submitting ? <Loader size="sm" /> : "Create Subject"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* filters */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-wrap gap-6 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                <option value={1}>Year 1</option>
                <option value={2}>Year 2</option>
                <option value={3}>Year 3</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Semester:</span>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(Number(e.target.value))}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                {[1,2,3,4,5,6].map((s) => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Branch:</span>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="px-2 py-1 border border-border rounded-md bg-background text-sm"
              >
                
                <option value="DCME">DCME</option>
              </select>
            </div>
          </div>
        </GlassCard>

        {/* subjects table */}
        <GlassCard className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Sem</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subjects.map((sub) => (
                <TableRow key={sub._id}>
                  <TableCell className="font-medium">{sub.code}</TableCell>
                  <TableCell>{sub.name}</TableCell>
                  <TableCell>{sub.semester}</TableCell>
                  <TableCell>{sub.branch_code}</TableCell>
                  <TableCell>{sub.type}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={async () => {
                        if (!confirm("Delete this subject?")) return;
                        try {
                          const { res, data } = await fetchJson(`/api/subjects/${sub._id}`, { method: "DELETE" });
                          if (!res.ok) {
                            toast.error(data?.error || "Failed to delete");
                            return;
                          }
                          toast.success("Subject deleted");
                          fetchSubjects();
                        } catch (err) {
                          console.error(err);
                          toast.error("Delete failed");
                        }
                      }}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </GlassCard>
      </PageWrapper>
    </>
  );
};

export default FacultySubjects;
