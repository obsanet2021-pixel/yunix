import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStaffPermissions } from '@/hooks/useStaffPermissions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, BookOpen, Upload, Plus, Trash2, Edit, GripVertical, 
  Users, Award, CheckCircle, Clock, FileText, Download, AlertTriangle, Eye, Pencil, ExternalLink, Image
} from 'lucide-react';

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

interface StudentProgress {
  user_id: string;
  user_email: string;
  user_name: string;
  total_courses: number;
  completed_courses: number;
  progress_percentage: number;
  eligible_for_certificate: boolean;
}

interface FinalCertificate {
  id: string;
  user_id: string;
  certificate_url: string;
  issued_at: string;
  user_email?: string;
  user_name?: string;
}

export default function CourseManagerDashboard() {
  const navigate = useNavigate();
  const { loading, hasPermission, isCEO } = useStaffPermissions();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [certificates, setCertificates] = useState<FinalCertificate[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  // Dialog states
  const [courseDialogOpen, setCourseDialogOpen] = useState(false);
  const [lessonDialogOpen, setLessonDialogOpen] = useState(false);
  const [certDialogOpen, setCertDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [selectedStudentForCert, setSelectedStudentForCert] = useState<string>('');
  
  // Certificate gallery states
  const [viewCertDialogOpen, setViewCertDialogOpen] = useState(false);
  const [editNameDialogOpen, setEditNameDialogOpen] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<FinalCertificate | null>(null);
  const [editingName, setEditingName] = useState('');
  
  // Form states
  const [courseForm, setCourseForm] = useState({
    title: '', description: '', category: '', level: 'beginner', hours: 0, video_url: '', published: false
  });
  const [lessonForm, setLessonForm] = useState({
    title: '', content: '', video_url: '', order_index: 0
  });
  const [certFile, setCertFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (hasPermission('manage_courses') || isCEO)) {
      fetchCourses();
      fetchStudentProgress();
      fetchCertificates();
    }
  }, [loading]);

  useEffect(() => {
    if (selectedCourse) {
      fetchLessons(selectedCourse.id);
    }
  }, [selectedCourse]);

  const fetchCourses = async () => {
    const { data, error } = await supabase
      .from('courses')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setCourses(data);
  };

  const fetchLessons = async (courseId: string) => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });
    
    if (!error && data) setLessons(data);
  };

  const fetchStudentProgress = async () => {
    const { data: progressData, error: progressError } = await supabase
      .from('student_progress')
      .select('user_id, course_id, progress_percentage');

    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, email, name');

    const { data: coursesData } = await supabase
      .from('courses')
      .select('id')
      .eq('published', true);

    if (progressError || !coursesData) return;

    const totalCourses = coursesData.length;
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    
    const userProgressMap = new Map<string, { completed: number; total: number }>();
    
    progressData?.forEach(p => {
      const current = userProgressMap.get(p.user_id) || { completed: 0, total: 0 };
      current.total++;
      if (p.progress_percentage >= 100) current.completed++;
      userProgressMap.set(p.user_id, current);
    });

    const studentList: StudentProgress[] = Array.from(userProgressMap.entries()).map(([userId, data]) => {
      const profile = profilesMap.get(userId);
      return {
        user_id: userId,
        user_email: profile?.email || 'Unknown',
        user_name: profile?.name || 'Unknown',
        total_courses: totalCourses,
        completed_courses: data.completed,
        progress_percentage: totalCourses > 0 ? (data.completed / totalCourses) * 100 : 0,
        eligible_for_certificate: data.completed >= totalCourses && totalCourses > 0
      };
    });

    setStudents(studentList.sort((a, b) => b.progress_percentage - a.progress_percentage));
  };

  const fetchCertificates = async () => {
    const { data, error } = await supabase
      .from('final_certificates')
      .select('*')
      .order('issued_at', { ascending: false });

    if (!error && data) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, name');
      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
      
      const enriched = data.map(cert => ({
        ...cert,
        user_email: profilesMap.get(cert.user_id)?.email,
        user_name: profilesMap.get(cert.user_id)?.name
      }));
      setCertificates(enriched);
    }
  };

  const generateSlug = (title: string) => {
    return title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').substring(0, 100);
  };

  const handleSaveCourse = async () => {
    if (!courseForm.title.trim()) {
      toast({ title: 'Error', description: 'Course title is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      let thumbnailUrl = editingCourse?.thumbnail_url || null;

      if (thumbnailFile) {
        const fileExt = thumbnailFile.name.split('.').pop();
        const fileName = `${generateSlug(courseForm.title)}-${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('course-thumbnails')
          .upload(`thumbnails/${fileName}`, thumbnailFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('course-thumbnails')
          .getPublicUrl(`thumbnails/${fileName}`);

        thumbnailUrl = publicUrl;
      }

      const courseData = {
        title: courseForm.title,
        description: courseForm.description,
        category: courseForm.category,
        level: courseForm.level,
        hours: courseForm.hours,
        video_url: courseForm.video_url,
        published: courseForm.published,
        thumbnail_url: thumbnailUrl,
        slug: generateSlug(courseForm.title)
      };

      if (editingCourse) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', editingCourse.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Course updated successfully' });
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('courses')
          .insert({ ...courseData, author_id: user?.id });
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Course created successfully' });
      }

      setCourseDialogOpen(false);
      setEditingCourse(null);
      setCourseForm({ title: '', description: '', category: '', level: 'beginner', hours: 0, video_url: '', published: false });
      setThumbnailFile(null);
      fetchCourses();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course? All lessons will be deleted.')) return;

    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete course', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Course deleted' });
      fetchCourses();
      if (selectedCourse?.id === courseId) setSelectedCourse(null);
    }
  };

  const handleSaveLesson = async () => {
    if (!selectedCourse || !lessonForm.title.trim()) {
      toast({ title: 'Error', description: 'Lesson title is required', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const lessonData = {
        course_id: selectedCourse.id,
        title: lessonForm.title,
        content: lessonForm.content,
        video_url: lessonForm.video_url,
        order_index: lessonForm.order_index
      };

      if (editingLesson) {
        const { error } = await supabase
          .from('lessons')
          .update(lessonData)
          .eq('id', editingLesson.id);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Lesson updated' });
      } else {
        const { error } = await supabase.from('lessons').insert(lessonData);
        
        if (error) throw error;
        toast({ title: 'Success', description: 'Lesson added' });
      }

      setLessonDialogOpen(false);
      setEditingLesson(null);
      setLessonForm({ title: '', content: '', video_url: '', order_index: lessons.length });
      fetchLessons(selectedCourse.id);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete lesson', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Lesson deleted' });
      if (selectedCourse) fetchLessons(selectedCourse.id);
    }
  };

  // Get selected student info for preview
  const getSelectedStudentInfo = () => {
    return students.find(s => s.user_id === selectedStudentForCert);
  };

  const handleUploadCertificate = async () => {
    const studentInfo = getSelectedStudentInfo();
    
    if (!selectedStudentForCert || !certFile) {
      toast({ title: 'Error', description: 'Please select a student and upload a certificate image (JPG)', variant: 'destructive' });
      return;
    }

    // Validate student name
    if (!studentInfo?.user_name || studentInfo.user_name === 'Unknown') {
      toast({ 
        title: 'Profile Incomplete', 
        description: 'This student must update their name before a certificate can be issued. Please ask them to update their profile.',
        variant: 'destructive' 
      });
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const fileName = `cert-${selectedStudentForCert}-${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(`final/${fileName}`, certFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(`final/${fileName}`);

      const { error } = await supabase.from('final_certificates').insert({
        user_id: selectedStudentForCert,
        certificate_url: publicUrl,
        issued_by: user?.id
      });

      if (error) throw error;

      toast({ title: 'Success', description: `Certificate issued to ${studentInfo.user_name}!` });
      setCertDialogOpen(false);
      setPreviewDialogOpen(false);
      setSelectedStudentForCert('');
      setCertFile(null);
      fetchCertificates();
      fetchStudentProgress();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCertificate = async (certId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete the certificate for ${userName}? This action cannot be undone.`)) return;

    const { error } = await supabase.from('final_certificates').delete().eq('id', certId);
    
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete certificate', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Certificate deleted' });
      setViewCertDialogOpen(false);
      setSelectedCertificate(null);
      fetchCertificates();
      fetchStudentProgress();
    }
  };

  const openEditNameDialog = (cert: FinalCertificate) => {
    setSelectedCertificate(cert);
    setEditingName(cert.user_name || '');
    setEditNameDialogOpen(true);
  };

  const handleUpdateStudentName = async () => {
    if (!selectedCertificate || !editingName.trim()) {
      toast({ title: 'Error', description: 'Name cannot be empty', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: editingName.trim() })
        .eq('id', selectedCertificate.user_id);

      if (error) throw error;

      toast({ title: 'Success', description: 'Student name updated successfully' });
      setEditNameDialogOpen(false);
      setSelectedCertificate(null);
      fetchCertificates();
      fetchStudentProgress();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const openViewCertificate = (cert: FinalCertificate) => {
    setSelectedCertificate(cert);
    setViewCertDialogOpen(true);
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseForm({
      title: course.title,
      description: course.description || '',
      category: course.category || '',
      level: course.level || 'beginner',
      hours: course.hours || 0,
      video_url: course.video_url || '',
      published: course.published
    });
    setCourseDialogOpen(true);
  };

  const openEditLesson = (lesson: Lesson) => {
    setEditingLesson(lesson);
    setLessonForm({
      title: lesson.title,
      content: lesson.content || '',
      video_url: lesson.video_url || '',
      order_index: lesson.order_index
    });
    setLessonDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasPermission('manage_courses') && !isCEO) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <p className="text-muted-foreground">You don't have permission to access this page.</p>
        <Button onClick={() => navigate('/app/dashboard')}>Go to Dashboard</Button>
      </div>
    );
  }

  // Filter eligible students - only those with valid names
  const eligibleStudents = students.filter(s => 
    s.eligible_for_certificate && 
    !certificates.some(c => c.user_id === s.user_id) &&
    s.user_name && s.user_name !== 'Unknown'
  );

  // Students with incomplete profiles
  const incompleteProfileStudents = students.filter(s => 
    s.eligible_for_certificate && 
    !certificates.some(c => c.user_id === s.user_id) &&
    (!s.user_name || s.user_name === 'Unknown')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/dashboard')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Course Manager Dashboard</h1>
          <p className="text-muted-foreground">Manage courses, lessons, and student certifications</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Total Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courses.length}</div>
            <p className="text-xs text-muted-foreground">{courses.filter(c => c.published).length} published</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{students.length}</div>
            <p className="text-xs text-muted-foreground">with progress</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Eligible for Cert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{eligibleStudents.length}</div>
            <p className="text-xs text-muted-foreground">completed all courses</p>
          </CardContent>
        </Card>
        <Card className="glow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <Award className="h-4 w-4" /> Certificates Issued
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{certificates.length}</div>
            <p className="text-xs text-muted-foreground">final certificates</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="courses" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="courses">Manage Courses</TabsTrigger>
          <TabsTrigger value="students">Student Progress</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* COURSES TAB */}
        <TabsContent value="courses" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">All Courses</h2>
            <Dialog open={courseDialogOpen} onOpenChange={setCourseDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => { setEditingCourse(null); setCourseForm({ title: '', description: '', category: '', level: 'beginner', hours: 0, video_url: '', published: false }); }}>
                  <Plus className="h-4 w-4 mr-2" /> Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Title *</Label>
                      <Input value={courseForm.title} onChange={e => setCourseForm({...courseForm, title: e.target.value})} placeholder="Course title" />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Input value={courseForm.category} onChange={e => setCourseForm({...courseForm, category: e.target.value})} placeholder="e.g., Trading Basics" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Level</Label>
                      <Select value={courseForm.level} onValueChange={v => setCourseForm({...courseForm, level: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Beginner</SelectItem>
                          <SelectItem value="intermediate">Intermediate</SelectItem>
                          <SelectItem value="advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Hours</Label>
                      <Input type="number" value={courseForm.hours} onChange={e => setCourseForm({...courseForm, hours: parseFloat(e.target.value) || 0})} placeholder="Duration in hours" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={courseForm.description} onChange={e => setCourseForm({...courseForm, description: e.target.value})} rows={3} />
                  </div>
                  <div className="space-y-2">
                    <Label>Video URL</Label>
                    <Input value={courseForm.video_url} onChange={e => setCourseForm({...courseForm, video_url: e.target.value})} placeholder="YouTube or Vimeo URL" />
                  </div>
                  <div className="space-y-2">
                    <Label>Thumbnail</Label>
                    <Input type="file" accept="image/*" onChange={e => setThumbnailFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <Label>Published</Label>
                    <Switch checked={courseForm.published} onCheckedChange={v => setCourseForm({...courseForm, published: v})} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCourseDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleSaveCourse} disabled={submitting}>
                    {submitting ? 'Saving...' : editingCourse ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Course List */}
            <Card className="glow-card">
              <CardHeader>
                <CardTitle className="text-lg">Courses</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {courses.map(course => (
                  <div
                    key={course.id}
                    onClick={() => setSelectedCourse(course)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedCourse?.id === course.id ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{course.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">{course.level}</Badge>
                          {course.published ? <Badge className="text-xs bg-[hsl(142,71%,45%)]">Published</Badge> : <Badge variant="secondary" className="text-xs">Draft</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditCourse(course); }}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDeleteCourse(course.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">No courses yet. Create your first course!</p>
                )}
              </CardContent>
            </Card>

            {/* Lessons Panel */}
            <Card className="glow-card">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Lessons</CardTitle>
                  <CardDescription>{selectedCourse ? selectedCourse.title : 'Select a course'}</CardDescription>
                </div>
                {selectedCourse && (
                  <Dialog open={lessonDialogOpen} onOpenChange={setLessonDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={() => { setEditingLesson(null); setLessonForm({ title: '', content: '', video_url: '', order_index: lessons.length }); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Lesson
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingLesson ? 'Edit Lesson' : 'Add New Lesson'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label>Title *</Label>
                          <Input value={lessonForm.title} onChange={e => setLessonForm({...lessonForm, title: e.target.value})} placeholder="Lesson title" />
                        </div>
                        <div className="space-y-2">
                          <Label>Content</Label>
                          <Textarea value={lessonForm.content} onChange={e => setLessonForm({...lessonForm, content: e.target.value})} rows={4} placeholder="Lesson content..." />
                        </div>
                        <div className="space-y-2">
                          <Label>Video URL</Label>
                          <Input value={lessonForm.video_url} onChange={e => setLessonForm({...lessonForm, video_url: e.target.value})} placeholder="YouTube or Vimeo URL" />
                        </div>
                        <div className="space-y-2">
                          <Label>Order</Label>
                          <Input type="number" value={lessonForm.order_index} onChange={e => setLessonForm({...lessonForm, order_index: parseInt(e.target.value) || 0})} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setLessonDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveLesson} disabled={submitting}>
                          {submitting ? 'Saving...' : editingLesson ? 'Update' : 'Add'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedCourse ? (
                  lessons.length > 0 ? (
                    lessons.map((lesson, idx) => (
                      <div key={lesson.id} className="flex items-center gap-2 p-3 rounded-lg border hover:bg-muted/50">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground w-6">{idx + 1}.</span>
                        <span className="flex-1 font-medium">{lesson.title}</span>
                        <Button size="icon" variant="ghost" onClick={() => openEditLesson(lesson)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDeleteLesson(lesson.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">No lessons yet. Add your first lesson!</p>
                  )
                ) : (
                  <p className="text-center text-muted-foreground py-8">Select a course to manage lessons</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STUDENTS TAB */}
        <TabsContent value="students" className="mt-4">
          <Card className="glow-card">
            <CardHeader>
              <CardTitle>Student Progress</CardTitle>
              <CardDescription>Track student progress across all courses</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(student => (
                    <TableRow key={student.user_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {student.user_name}
                          {(!student.user_name || student.user_name === 'Unknown') && (
                            <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              No name
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{student.user_email}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={student.progress_percentage} className="w-24" />
                          <span className="text-sm">{student.progress_percentage.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                      <TableCell>{student.completed_courses}/{student.total_courses} courses</TableCell>
                      <TableCell>
                        {student.eligible_for_certificate ? (
                          certificates.some(c => c.user_id === student.user_id) ? (
                            <Badge className="bg-[hsl(142,71%,45%)]">Certified</Badge>
                          ) : (
                            <Badge variant="outline" className="text-primary">Eligible</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">In Progress</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {students.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No student progress data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CERTIFICATES TAB */}
        <TabsContent value="certificates" className="mt-4 space-y-4">
          {/* Incomplete Profiles Warning */}
          {incompleteProfileStudents.length > 0 && (
            <Alert className="border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-yellow-500">
                {incompleteProfileStudents.length} student(s) have completed all courses but have incomplete profiles (missing name). 
                They need to update their profile before certificates can be issued.
              </AlertDescription>
            </Alert>
          )}

          {/* Issue Certificate */}
          {eligibleStudents.length > 0 && (
            <Card className="glow-card border-primary/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Issue Final Certificate
                </CardTitle>
                <CardDescription>
                  {eligibleStudents.length} student(s) have completed all courses and are eligible for certification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Dialog open={certDialogOpen} onOpenChange={setCertDialogOpen}>
                  <DialogTrigger asChild>
                    <Button><Upload className="h-4 w-4 mr-2" /> Issue Certificate</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Issue Final Certificate</DialogTitle>
                      <DialogDescription>
                        Select an eligible student and upload their certificate image (JPG)
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Select Student</Label>
                        <Select value={selectedStudentForCert} onValueChange={setSelectedStudentForCert}>
                          <SelectTrigger><SelectValue placeholder="Select eligible student" /></SelectTrigger>
                          <SelectContent>
                            {eligibleStudents.map(s => (
                              <SelectItem key={s.user_id} value={s.user_id}>
                                {s.user_name} ({s.user_email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Certificate Image (JPG) *</Label>
                        <Input type="file" accept=".jpg,.jpeg,image/jpeg" onChange={e => setCertFile(e.target.files?.[0] || null)} />
                        <p className="text-xs text-muted-foreground">Upload the final master certificate image (JPG format)</p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setCertDialogOpen(false)}>Cancel</Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => { setCertDialogOpen(false); setPreviewDialogOpen(true); }}
                        disabled={!selectedStudentForCert || !certFile}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Preview Dialog */}
                <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Certificate Preview</DialogTitle>
                      <DialogDescription>
                        Confirm the details before issuing the certificate
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="p-6 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5 text-center">
                        <Award className="h-12 w-12 mx-auto text-primary mb-4" />
                        <p className="text-sm text-muted-foreground mb-2">Certificate will be issued to:</p>
                        <p className="text-2xl font-bold text-primary">
                          {getSelectedStudentInfo()?.user_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          {getSelectedStudentInfo()?.user_email}
                        </p>
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-sm font-medium">All YUNIX Trading Courses</p>
                          <p className="text-xs text-muted-foreground">Completion Certificate</p>
                        </div>
                      </div>
                      {certFile && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
                          <Image className="h-5 w-5 text-primary" />
                          <span className="text-sm flex-1 truncate">{certFile.name}</span>
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => { setPreviewDialogOpen(false); setCertDialogOpen(true); }}>
                        Back
                      </Button>
                      <Button onClick={handleUploadCertificate} disabled={submitting}>
                        {submitting ? 'Issuing...' : 'Confirm & Issue Certificate'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          )}

          {/* Issued Certificates Gallery */}
          <Card className="glow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Issued Certificates Gallery
              </CardTitle>
              <CardDescription>All final certificates that have been issued - click to view or manage</CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {certificates.map(cert => (
                    <Card key={cert.id} className="overflow-hidden group hover:shadow-lg transition-shadow">
                        </div>
                      </div>
                      
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate flex-1">{cert.user_name || 'Unknown'}</span>
                          <Button 
                            size="icon" 
                            variant="ghost" 
                            className="h-7 w-7 shrink-0"
                            onClick={() => openEditNameDialog(cert)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{cert.user_email || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">
                          Issued: {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                        <div className="flex gap-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            asChild
                          >
                            <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Open
                            </a>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteCertificate(cert.id, cert.user_name || 'Unknown')}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No certificates issued yet</p>
                  <p className="text-sm mt-1">Issue certificates to eligible students above</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* View Certificate Dialog */}
          <Dialog open={viewCertDialogOpen} onOpenChange={setViewCertDialogOpen}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Certificate Details</DialogTitle>
              </DialogHeader>
              {selectedCertificate && (
                <div className="space-y-4">
                  <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden">
                    <img 
                      src={selectedCertificate.certificate_url} 
                      alt={`Certificate for ${selectedCertificate.user_name}`}
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-lg">{selectedCertificate.user_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{selectedCertificate.user_email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Issued on {new Date(selectedCertificate.issued_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => openEditNameDialog(selectedCertificate)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit Name
                      </Button>
                      <Button variant="outline" asChild>
                        <a href={selectedCertificate.certificate_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-1" /> Open Full Size
                        </a>
                      </Button>
                      <Button 
                        variant="destructive"
                        onClick={() => handleDeleteCertificate(selectedCertificate.id, selectedCertificate.user_name || 'Unknown')}
                      >
                        <Trash2 className="h-4 w-4 mr-1" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Name Dialog */}
          <Dialog open={editNameDialogOpen} onOpenChange={setEditNameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Student Name</DialogTitle>
                <DialogDescription>
                  Update the student's name in their profile. This will reflect across the platform.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Student Name</Label>
                  <Input 
                    value={editingName} 
                    onChange={(e) => setEditingName(e.target.value)}
                    placeholder="Enter student name"
                  />
                </div>
                {selectedCertificate && (
                  <p className="text-sm text-muted-foreground">
                    Email: {selectedCertificate.user_email}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditNameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateStudentName} disabled={submitting}>
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}