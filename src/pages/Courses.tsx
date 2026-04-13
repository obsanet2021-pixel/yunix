import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Video, Clock, Award, BookOpen, Play, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";

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

interface CourseProgress {
  course_id: string;
  progress_percentage: number;
}

export default function Courses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [progress, setProgress] = useState<CourseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'in-progress' | 'completed'>('all');
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
    fetchProgress();
  }, []);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from("courses")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching courses:", error);
      return;
    }

    setCourses(data || []);
    setLoading(false);
  };

  const fetchProgress = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("student_progress")
      .select("course_id, progress_percentage")
      .eq("user_id", user.id);

    if (!error && data) {
      const courseProgressMap = new Map<string, number>();
      data.forEach(p => {
        const current = courseProgressMap.get(p.course_id) || 0;
        courseProgressMap.set(p.course_id, Math.max(current, p.progress_percentage || 0));
      });
      
      setProgress(Array.from(courseProgressMap.entries()).map(([course_id, progress_percentage]) => ({
        course_id,
        progress_percentage
      })));
    }
  };

  const getCourseProgress = (courseId: string): number => {
    const p = progress.find(p => p.course_id === courseId);
    return p?.progress_percentage || 0;
  };

  const filteredCourses = courses.filter(course => {
    const prog = getCourseProgress(course.id);
    if (filter === 'in-progress') return prog > 0 && prog < 100;
    if (filter === 'completed') return prog >= 100;
    return true;
  });

  const getLevelColor = (level: string | null) => {
    switch (level) {
      case 'beginner': return 'bg-success/10 text-success border-success/20';
      case 'intermediate': return 'bg-primary/10 text-primary border-primary/20';
      case 'advanced': return 'bg-destructive/10 text-destructive border-destructive/20';
      default: return 'bg-secondary/10 text-secondary-foreground border-secondary/20';
    }
  };

  const handleStartCourse = async (course: Course) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ 
        title: 'Please sign in', 
        description: 'You need to be signed in to start a course', 
        variant: 'destructive' 
      });
      return;
    }

    const existingProgress = getCourseProgress(course.id);
    if (existingProgress === 0) {
      await supabase.from('student_progress').insert({
        user_id: user.id,
        course_id: course.id,
        progress_percentage: 0
      });
    }

    navigate(`/app/courses/${course.slug}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-1">Courses</h1>
        <p className="text-muted-foreground">Master trading with our comprehensive courses</p>
      </div>

      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto min-h-12 gap-1 p-1">
          <TabsTrigger value="all" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 flex-wrap">
            <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">All</span>
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 flex-wrap">
            <Play className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">In Progress</span>
          </TabsTrigger>
          <TabsTrigger value="completed" className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 py-2 flex-wrap">
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">Done</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-6">
          {filteredCourses.length === 0 ? (
            <Card className="glow-card">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Video className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  {filter === 'all' ? 'No Courses Available' : filter === 'in-progress' ? 'No Courses In Progress' : 'No Completed Courses'}
                </h3>
                <p className="text-muted-foreground text-center max-w-md">
                  {filter === 'all' ? 'Check back soon for new content' : filter === 'in-progress' ? 'Start a course to see it here' : 'Complete courses to earn your certificate'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredCourses.map((course) => {
                const courseProgress = getCourseProgress(course.id);
                const isCompleted = courseProgress >= 100;
                const isInProgress = courseProgress > 0 && courseProgress < 100;

                return (
                  <Card key={course.id} className="glow-card overflow-hidden group">
                    {/* Thumbnail */}
                    <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                      {course.thumbnail_url ? (
                        <img 
                          src={course.thumbnail_url} 
                          alt={course.title} 
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      ) : (
                        <Video className="h-12 w-12 text-muted-foreground" />
                      )}
                      {/* Level Badge */}
                      <Badge className={`absolute top-3 left-3 ${getLevelColor(course.level)}`}>
                        {course.level || 'General'}
                      </Badge>
                      {/* Certificate Badge */}
                      <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground">
                        <Award className="h-3 w-3 mr-1" /> Certificate
                      </Badge>
                    </div>

                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description || "No description available"}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Course Info */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        {course.hours && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>{course.hours}h</span>
                          </div>
                        )}
                        {course.category && (
                          <Badge variant="outline" className="text-xs">{course.category}</Badge>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {(isInProgress || isCompleted) && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progress</span>
                            <span className={isCompleted ? 'text-success font-medium' : 'text-primary font-medium'}>
                              {courseProgress.toFixed(0)}%
                            </span>
                          </div>
                          <Progress value={courseProgress} className="h-2" />
                        </div>
                      )}

                      {/* Action Button */}
                      <Button 
                        className="w-full" 
                        variant={isCompleted ? "outline" : "default"}
                        onClick={() => handleStartCourse(course)}
                      >
                        {isCompleted ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Review Course
                          </>
                        ) : isInProgress ? (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Continue Learning
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2" />
                            Start Course
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
