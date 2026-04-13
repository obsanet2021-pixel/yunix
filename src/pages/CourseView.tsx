import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Video, CheckCircle, Play, Lock, BookOpen } from "lucide-react";

interface Course {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  category: string | null;
  level: string | null;
  hours: number | null;
  thumbnail_url: string | null;
  video_url: string | null;
  published: boolean;
  created_at: string;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  order_index: number;
}

interface LessonProgress {
  lesson_id: string;
  completed: boolean;
}

export default function CourseView() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCourse();
  }, [slug]);

  const fetchCourse = async () => {
    if (!slug) {
      navigate("/app/courses");
      return;
    }

    const { data: courseData, error: courseError } = await supabase
      .from("courses")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (courseError || !courseData) {
      toast({
        title: "Course Not Found",
        description: "This course doesn't exist or is no longer available",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    setCourse(courseData);

    // Fetch lessons
    const { data: lessonsData } = await supabase
      .from("lessons")
      .select("*")
      .eq("course_id", courseData.id)
      .order("order_index", { ascending: true });

    setLessons(lessonsData || []);
    if (lessonsData && lessonsData.length > 0) {
      setSelectedLesson(lessonsData[0]);
    }

    // Fetch user's progress
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: progressData } = await supabase
        .from("student_progress")
        .select("lesson_id, completed")
        .eq("user_id", user.id)
        .eq("course_id", courseData.id);

      setLessonProgress(progressData || []);
    }

    setLoading(false);
  };

  const isLessonCompleted = (lessonId: string): boolean => {
    return lessonProgress.some(p => p.lesson_id === lessonId && p.completed);
  };

  const getOverallProgress = (): number => {
    if (lessons.length === 0) return 0;
    const completed = lessonProgress.filter(p => p.completed).length;
    return (completed / lessons.length) * 100;
  };

  const markLessonComplete = async (lesson: Lesson) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !course) return;

    const alreadyCompleted = isLessonCompleted(lesson.id);
    if (alreadyCompleted) return;

    // Upsert progress
    const { error } = await supabase
      .from("student_progress")
      .upsert({
        user_id: user.id,
        course_id: course.id,
        lesson_id: lesson.id,
        completed: true,
        completed_at: new Date().toISOString(),
        progress_percentage: ((lessonProgress.filter(p => p.completed).length + 1) / lessons.length) * 100
      }, {
        onConflict: 'user_id,course_id,lesson_id'
      });

    if (error) {
      toast({ title: "Error", description: "Failed to save progress", variant: "destructive" });
      return;
    }

    // Update local state
    setLessonProgress([...lessonProgress, { lesson_id: lesson.id, completed: true }]);

    // Update course-level progress
    const newProgress = ((lessonProgress.filter(p => p.completed).length + 1) / lessons.length) * 100;
    await supabase
      .from("student_progress")
      .upsert({
        user_id: user.id,
        course_id: course.id,
        lesson_id: null,
        progress_percentage: newProgress
      }, {
        onConflict: 'user_id,course_id,lesson_id'
      });

    toast({ title: "Progress Saved!", description: `Lesson "${lesson.title}" marked as complete` });

    // Auto-advance to next lesson
    const currentIndex = lessons.findIndex(l => l.id === lesson.id);
    if (currentIndex < lessons.length - 1) {
      setSelectedLesson(lessons[currentIndex + 1]);
    }
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      const videoId = url.includes("youtu.be") 
        ? url.split("/").pop()?.split("?")[0]
        : new URLSearchParams(new URL(url).search).get("v");
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    if (url.includes("vimeo.com")) {
      const videoId = url.split("/").pop();
      return `https://player.vimeo.com/video/${videoId}`;
    }
    
    return url;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading course...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <Video className="h-16 w-16 text-muted-foreground" />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Course Not Found</h2>
          <p className="text-muted-foreground mb-4">
            This course doesn't exist or is no longer available.
          </p>
          <Button onClick={() => navigate("/app/courses")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Courses
          </Button>
        </div>
      </div>
    );
  }

  const overallProgress = getOverallProgress();
  const isCompleted = overallProgress >= 100;

  return (
    <div className="space-y-6 overflow-x-hidden w-full max-w-full">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => navigate("/app/courses")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Back to Courses</span>
          <span className="sm:hidden">Back</span>
        </Button>
        <div className="flex items-center gap-2">
          {isCompleted && (
            <Badge className="bg-[hsl(142,71%,45%)]">
              <CheckCircle className="h-3 w-3 mr-1" /> Completed
            </Badge>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <Card className="glow-card w-full">
        <CardContent className="py-4 px-3 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
            <h2 className="text-lg sm:text-xl font-bold line-clamp-2">{course.title}</h2>
            <span className={`font-semibold text-sm sm:text-base whitespace-nowrap ${isCompleted ? 'text-[hsl(142,71%,45%)]' : 'text-primary'}`}>
              {overallProgress.toFixed(0)}% Complete
            </span>
          </div>
          <Progress value={overallProgress} className="h-2" />
          <p className="text-sm text-muted-foreground mt-2">
            {lessonProgress.filter(p => p.completed).length} of {lessons.length} lessons completed
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {/* Lessons Sidebar */}
        <Card className="glow-card w-full lg:col-span-1">
          <CardHeader className="px-3 sm:px-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              Lessons
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[300px] sm:max-h-[500px] overflow-y-auto px-3 sm:px-6">
            {lessons.length > 0 ? (
              lessons.map((lesson, idx) => {
                const completed = isLessonCompleted(lesson.id);
                const isSelected = selectedLesson?.id === lesson.id;

                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-2 sm:p-3 rounded-lg border transition-all flex items-center gap-2 sm:gap-3 ${
                      isSelected 
                        ? 'bg-primary/10 border-primary' 
                        : 'hover:bg-muted/50 border-border'
                    }`}
                  >
                    <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold flex-shrink-0 ${
                      completed 
                        ? 'bg-[hsl(142,71%,45%)] text-white' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {completed ? <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" /> : idx + 1}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      <p className={`font-medium text-sm sm:text-base truncate ${completed ? 'text-muted-foreground' : ''}`}>
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No lessons available yet
              </p>
            )}
          </CardContent>
        </Card>

        {/* Lesson Content */}
        <Card className="glow-card w-full lg:col-span-2 overflow-hidden">
          <CardContent className="p-0">
            {selectedLesson ? (
              <>
                {/* Video Player */}
                {selectedLesson.video_url ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={getEmbedUrl(selectedLesson.video_url)}
                      title={selectedLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : course.video_url ? (
                  <div className="aspect-video bg-black">
                    <iframe
                      src={getEmbedUrl(course.video_url)}
                      title={course.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex items-center justify-center">
                    <Video className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}

                {/* Lesson Info */}
                <div className="p-4 sm:p-6 space-y-4">
                  <div>
                    <h3 className="text-xl sm:text-2xl font-bold mb-2 break-words">{selectedLesson.title}</h3>
                    {selectedLesson.content && (
                      <p className="text-sm sm:text-base text-muted-foreground whitespace-pre-wrap break-words">
                        {selectedLesson.content}
                      </p>
                    )}
                  </div>

                  {/* Mark Complete Button */}
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 pt-4 border-t">
                    {isLessonCompleted(selectedLesson.id) ? (
                      <Badge className="bg-[hsl(142,71%,45%)] text-white py-2 px-3 sm:px-4 text-xs sm:text-sm">
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                        Lesson Completed
                      </Badge>
                    ) : (
                      <Button onClick={() => markLessonComplete(selectedLesson)} className="gap-2 text-sm sm:text-base w-full sm:w-auto">
                        <CheckCircle className="h-4 w-4" />
                        Mark as Complete
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a lesson to begin</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
