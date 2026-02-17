CREATE TYPE public.app_role AS ENUM ('faculty', 'student');

CREATE TYPE public.gender AS ENUM ('male', 'female', 'other');

CREATE TYPE public.exam_type AS ENUM ('unit_test_internal', 'unit_test_external', 'lab_internal', 'lab_external');

-- Supabase migration removed. Use MongoDB migration scripts for Atlas instead.
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role app_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create students table (managed by faculty)
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    roll_number TEXT NOT NULL UNIQUE,
    year_of_study INTEGER NOT NULL CHECK (year_of_study >= 1 AND year_of_study <= 4),
    gender gender NOT NULL,
    phone_number TEXT,
    branch_code TEXT NOT NULL DEFAULT 'CS',
    created_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create attendance table
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    is_present BOOLEAN NOT NULL DEFAULT false,
    marked_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, date)
);

-- Create subjects table
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    branch_code TEXT NOT NULL DEFAULT 'CS',
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create marks table
CREATE TABLE public.marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 8),
    exam_type exam_type NOT NULL,
    marks_obtained DECIMAL(5,2) NOT NULL CHECK (marks_obtained >= 0),
    total_marks DECIMAL(5,2) NOT NULL CHECK (total_marks > 0),
    entered_by UUID REFERENCES public.profiles(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(student_id, subject_id, semester, exam_type)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Create function to check if user is faculty
CREATE OR REPLACE FUNCTION public.is_faculty(user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = user_uuid AND role = 'faculty'
    );
$$;

-- Create function to get profile_id from user_id
CREATE OR REPLACE FUNCTION public.get_profile_id(user_uuid UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.profiles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Faculty can view all profiles"
    ON public.profiles FOR SELECT
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = user_id);

-- Students policies
CREATE POLICY "Faculty can view all students"
    ON public.students FOR SELECT
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Students can view their own record"
    ON public.students FOR SELECT
    USING (profile_id = public.get_profile_id(auth.uid()));

CREATE POLICY "Faculty can insert students"
    ON public.students FOR INSERT
    WITH CHECK (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can update students"
    ON public.students FOR UPDATE
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can delete students"
    ON public.students FOR DELETE
    USING (public.is_faculty(auth.uid()));

-- Attendance policies
CREATE POLICY "Faculty can view all attendance"
    ON public.attendance FOR SELECT
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Students can view their own attendance"
    ON public.attendance FOR SELECT
    USING (student_id IN (
        SELECT id FROM public.students WHERE profile_id = public.get_profile_id(auth.uid())
    ));

CREATE POLICY "Faculty can insert attendance"
    ON public.attendance FOR INSERT
    WITH CHECK (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can update attendance"
    ON public.attendance FOR UPDATE
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can delete attendance"
    ON public.attendance FOR DELETE
    USING (public.is_faculty(auth.uid()));

-- Subjects policies (readable by everyone authenticated)
CREATE POLICY "Authenticated users can view subjects"
    ON public.subjects FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Faculty can insert subjects"
    ON public.subjects FOR INSERT
    WITH CHECK (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can update subjects"
    ON public.subjects FOR UPDATE
    USING (public.is_faculty(auth.uid()));

-- Marks policies
CREATE POLICY "Faculty can view all marks"
    ON public.marks FOR SELECT
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Students can view their own marks"
    ON public.marks FOR SELECT
    USING (student_id IN (
        SELECT id FROM public.students WHERE profile_id = public.get_profile_id(auth.uid())
    ));

CREATE POLICY "Faculty can insert marks"
    ON public.marks FOR INSERT
    WITH CHECK (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can update marks"
    ON public.marks FOR UPDATE
    USING (public.is_faculty(auth.uid()));

CREATE POLICY "Faculty can delete marks"
    ON public.marks FOR DELETE
    USING (public.is_faculty(auth.uid()));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marks_updated_at
    BEFORE UPDATE ON public.marks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default subjects
INSERT INTO public.subjects (name, code, branch_code, semester) VALUES
    ('Mathematics I', 'MATH101', 'CS', 1),
    ('Physics', 'PHY101', 'CS', 1),
    ('Programming Fundamentals', 'CS101', 'CS', 1),
    ('Mathematics II', 'MATH102', 'CS', 2),
    ('Data Structures', 'CS201', 'CS', 2),
    ('Object Oriented Programming', 'CS202', 'CS', 2),
    ('Database Management', 'CS301', 'CS', 3),
    ('Operating Systems', 'CS302', 'CS', 3),
    ('Computer Networks', 'CS401', 'CS', 4),
    ('Software Engineering', 'CS402', 'CS', 4);