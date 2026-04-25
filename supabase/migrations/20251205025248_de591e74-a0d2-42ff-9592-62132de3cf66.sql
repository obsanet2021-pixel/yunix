-- Add lessons table for course modules
CREATE TABLE IF NOT EXISTS public.lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add student_progress table for tracking progress
CREATE TABLE IF NOT EXISTS public.student_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  progress_percentage NUMERIC DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, course_id, lesson_id)
);

-- Add final_certificates table for master certificates
CREATE TABLE IF NOT EXISTS public.final_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  certificate_url TEXT NOT NULL,
  issued_by UUID NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add hours and level columns to courses table
ALTER TABLE public.courses 
ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'beginner',
ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 0;

-- Enable RLS on all new tables
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.final_certificates ENABLE ROW LEVEL SECURITY;

-- Lessons policies - viewable by authenticated users if course is published
CREATE POLICY "Lessons viewable for published courses" ON public.lessons
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.courses WHERE courses.id = lessons.course_id AND (courses.published = true OR has_role(auth.uid(), 'admin'::app_role)))
);

CREATE POLICY "Admins and course managers can manage lessons" ON public.lessons
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR staff_has_permission(auth.uid(), 'manage_courses')
);

-- Student progress policies
CREATE POLICY "Users can view their own progress" ON public.student_progress
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.student_progress
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their progress" ON public.student_progress
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins and course managers can view all progress" ON public.student_progress
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role) OR staff_has_permission(auth.uid(), 'manage_courses')
);

-- Final certificates policies
CREATE POLICY "Users can view their own certificates" ON public.final_certificates
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins and course managers can manage certificates" ON public.final_certificates
FOR ALL USING (
  has_role(auth.uid(), 'admin'::app_role) OR staff_has_permission(auth.uid(), 'manage_courses')
);

-- Create trigger for updated_at
CREATE TRIGGER update_lessons_updated_at
BEFORE UPDATE ON public.lessons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_progress_updated_at
BEFORE UPDATE ON public.student_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();