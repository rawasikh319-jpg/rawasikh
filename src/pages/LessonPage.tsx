import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import VideoEmbed from "@/components/VideoEmbed";
import ZoomLinksInlineManager from "@/components/ZoomLinksInlineManager";
import ZoomJoinButton from "@/components/ZoomJoinButton";


import { getVideoEmbed } from "@/lib/videoEmbed";

import { 
  ArrowRight, 
  ArrowLeft, 
  PlayCircle, 
  Lock, 
  CheckCircle,
  Clock,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Check,
  FileQuestion,
  AlertCircle,
  FileText,
  Download,
  ExternalLink
} from "lucide-react";


interface Lesson {
  id: string;
  title: string;
  video_url: string | null;
  pdf_url: string | null;
  description: string | null;
  duration_minutes: number;
  is_free: boolean;
  order_index: number;
  section_id: string;
}


interface Section {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
}

interface Course {
  id: string;
  title: string;
  price: number;
}

interface QuizAssignment {
  id: string;
  quiz_id: string;
  section_id: string | null;
  lesson_id: string | null;
  quiz_type: "final" | "lesson";
  quiz: {
    id: string;
    title: string;
    passing_score: number;
  } | null;
}

interface QuizAttempt {
  id: string;
  quiz_id: string;
  passed: boolean;
}

// Extract YouTube video ID from URL
const getYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const LessonPage = () => {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const queryClient = useQueryClient();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  // Zoom links linked to this specific lesson
  const { data: lessonZoomLinks, isLoading: zoomLoading, isError: zoomError } = useQuery({
    queryKey: ["lesson_zoom_links", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("zoom_links" as any)
        .select("id, title, url, scheduled_at, duration_minutes, meeting_id, passcode")
        .eq("lesson_id", lessonId!)
        .eq("is_active", true)
        .order("scheduled_at", { ascending: true, nullsFirst: false });

      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!lessonId && !!user,
  });


  // Fetch course
  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title, price")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      return data as Course;
    },
    enabled: !!courseId,
  });

  // Check if user has purchased
  const { data: hasPurchased, isLoading: purchaseLoading } = useQuery({
    queryKey: ["course_purchase_check", courseId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from("course_purchases")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .eq("payment_status", "completed")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user && !!courseId,
  });

  // Fetch sections with lessons
  const { data: sections, isLoading: sectionsLoading } = useQuery({
    queryKey: ["course_sections_lessons", courseId],
    queryFn: async () => {
      const { data: sectionsData, error: sectionsError } = await supabase
        .from("course_sections")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      const sectionsWithLessons = await Promise.all(
        sectionsData.map(async (section) => {
          const { data: lessons, error: lessonsError } = await supabase
            .from("course_lessons")
            .select("*")
            .eq("section_id", section.id)
            .order("order_index");

          if (lessonsError) throw lessonsError;

          return {
            ...section,
            lessons: lessons || [],
          };
        })
      );

      return sectionsWithLessons as Section[];
    },
    enabled: !!courseId,
  });

  // Fetch quiz assignments for this course
  const { data: quizAssignments } = useQuery({
    queryKey: ["course_quizzes_student", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_quiz_assignments")
        .select(`
          id,
          quiz_id,
          section_id,
          lesson_id,
          quiz_type,
          course_quizzes (
            id,
            title,
            passing_score
          )
        `)
        .eq("course_id", courseId);
      if (error) throw error;
      return data.map((d: any) => ({
        ...d,
        quiz: d.course_quizzes,
      })) as QuizAssignment[];
    },
    enabled: !!courseId,
  });

  // Fetch user's passed quiz attempts
  const { data: passedQuizzes = [] } = useQuery({
    queryKey: ["passed_quizzes", courseId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const quizIds = quizAssignments?.map((q) => q.quiz_id) || [];
      if (quizIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("quiz_id")
        .eq("user_id", user.id)
        .eq("passed", true)
        .in("quiz_id", quizIds);
      if (error) throw error;
      return data.map((p) => p.quiz_id);
    },
    enabled: !!user && !!quizAssignments && quizAssignments.length > 0,
  });

  // Fetch this course's own survey/form (if the admin attached one) — shown
  // at the end of the course alongside the final exam.
  const { data: courseForms = [] } = useQuery({
    queryKey: ["course_forms", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forms" as any)
        .select("id, title, description")
        .eq("course_id", courseId)
        .eq("is_active", true);
      if (error) throw error;
      return (data as any[]) as { id: string; title: string; description: string | null }[];
    },
    enabled: !!courseId,
  });

  const { data: answeredFormIds = [] } = useQuery({
    queryKey: ["my_course_form_responses", courseId, user?.id, courseForms.map((f) => f.id).join(",")],
    queryFn: async () => {
      if (!user || courseForms.length === 0) return [];
      const formIds = courseForms.map((f) => f.id);
      const { data, error } = await supabase
        .from("form_responses" as any)
        .select("form_id")
        .eq("user_id", user.id)
        .in("form_id", formIds);
      if (error) throw error;
      return (data as any[]).map((r) => r.form_id) as string[];
    },
    enabled: !!user && courseForms.length > 0,
  });

  // Fetch completed lessons
  const { data: completedLessons = [] } = useQuery({
    queryKey: ["lesson_progress", courseId, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("lesson_progress")
        .select("lesson_id")
        .eq("course_id", courseId)
        .eq("user_id", user.id);
      if (error) throw error;
      return data.map((p) => p.lesson_id);
    },
    enabled: !!user && !!courseId,
  });

  // Mark lesson as complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (lessonIdToMark: string) => {
      if (!user || !courseId) throw new Error("Missing data");
      const { error } = await supabase
        .from("lesson_progress")
        .insert({
          user_id: user.id,
          lesson_id: lessonIdToMark,
          course_id: courseId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson_progress", courseId, user?.id] });
      toast({ title: t("lessonPage.completedToast") });
    },
  });

  // Unmark lesson mutation
  const unmarkCompleteMutation = useMutation({
    mutationFn: async (lessonIdToUnmark: string) => {
      if (!user) throw new Error("Missing user");
      const { error } = await supabase
        .from("lesson_progress")
        .delete()
        .eq("user_id", user.id)
        .eq("lesson_id", lessonIdToUnmark);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lesson_progress", courseId, user?.id] });
      toast({ title: t("lessonPage.uncompletedToast") });
    },
  });

  const isLessonCompleted = (lessonIdToCheck: string) => completedLessons.includes(lessonIdToCheck);

  const toggleLessonComplete = () => {
    if (!lessonId || !user) return;
    if (isLessonCompleted(lessonId)) {
      unmarkCompleteMutation.mutate(lessonId);
    } else {
      markCompleteMutation.mutate(lessonId);
    }
  };

  // Current lesson
  const currentLesson = sections
    ?.flatMap((s) => s.lessons)
    .find((l) => l.id === lessonId);

  // Get all lessons flat for navigation
  const allLessons = sections?.flatMap((s) => s.lessons) || [];
  const currentIndex = allLessons.findIndex((l) => l.id === lessonId);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  // Get current section for quiz check
  const currentSection = sections?.find((s) =>
    s.lessons.some((l) => l.id === lessonId)
  );

  // Check if there's an unpassed quiz blocking access to next lesson.
  // Final exams never block per-lesson navigation — they only unlock once
  // every lesson in the course is completed (shown on the course page).
  const getBlockingQuiz = () => {
    if (!quizAssignments) return null;

    // A quiz tied specifically to the current lesson takes priority.
    const lessonQuiz = quizAssignments.find(
      (q) => q.quiz_type !== "final" && q.lesson_id === lessonId
    );
    if (lessonQuiz && !passedQuizzes.includes(lessonQuiz.quiz_id)) {
      return lessonQuiz;
    }

    if (!currentSection) return null;

    // Legacy/whole-section quizzes (no specific lesson attached)
    const sectionQuizzes = quizAssignments.filter(
      (q) => q.section_id === currentSection.id && q.quiz_type !== "final" && !q.lesson_id
    );

    for (const assignment of sectionQuizzes) {
      if (!passedQuizzes.includes(assignment.quiz_id)) {
        return assignment;
      }
    }
    return null;
  };

  const blockingQuiz = getBlockingQuiz();

  // Calculate progress
  const totalLessons = allLessons.length;
  const completedCount = completedLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Expand current section by default
  useEffect(() => {
    if (currentLesson && sections) {
      const currentSection = sections.find((s) =>
        s.lessons.some((l) => l.id === lessonId)
      );
      if (currentSection && !expandedSections.includes(currentSection.id)) {
        setExpandedSections([...expandedSections, currentSection.id]);
      }
    }
  }, [currentLesson, sections, lessonId]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  // Find the earliest unpassed quiz that gates access to a given lesson —
  // i.e. any lesson-quiz or section-quiz assigned to an EARLIER lesson
  // (by section order, then lesson order) that hasn't been passed yet.
  // Final exams are excluded: they only unlock after all lessons are done
  // and never block navigation between individual lessons.
  const getQuizLockFor = (lesson: Lesson) => {
    if (!quizAssignments || quizAssignments.length === 0) return null;

    const idx = allLessons.findIndex((l) => l.id === lesson.id);
    if (idx <= 0) return null;

    // Any lesson strictly before this one with an unpassed lesson-quiz.
    for (let i = 0; i < idx; i++) {
      const priorLesson = allLessons[i];
      const priorQuiz = quizAssignments.find(
        (q) => q.quiz_type !== "final" && q.lesson_id === priorLesson.id
      );
      if (priorQuiz && !passedQuizzes.includes(priorQuiz.quiz_id)) {
        return { assignment: priorQuiz, afterLesson: priorLesson };
      }
    }

    // Any section strictly before this lesson's section with an unpassed
    // legacy whole-section quiz (no specific lesson attached).
    const thisSection = sections?.find((s) => s.lessons.some((l) => l.id === lesson.id));
    if (thisSection && sections) {
      for (const s of sections) {
        if (s.id === thisSection.id) break;
        const sectionQuiz = quizAssignments.find(
          (q) => q.section_id === s.id && q.quiz_type !== "final" && !q.lesson_id
        );
        if (sectionQuiz && !passedQuizzes.includes(sectionQuiz.quiz_id)) {
          return { assignment: sectionQuiz, afterLesson: null };
        }
      }
    }

    return null;
  };

  const canAccessLesson = (lesson: Lesson) => {
    // Free lessons or user has purchased
    const purchaseOk = lesson.is_free || hasPurchased || course?.price === 0;
    if (!purchaseOk) return false;

    // Even a purchased/free lesson stays locked until any earlier required
    // quiz has been passed — otherwise students could skip ahead via the
    // sidebar or a direct link and never solve the exam that's blocking them.
    return !getQuizLockFor(lesson);
  };

  const handleLessonClick = (lesson: Lesson) => {
    if (canAccessLesson(lesson)) {
      navigate(`/courses/${courseId}/lessons/${lesson.id}`);
    }
  };

  if (sectionsLoading || purchaseLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shell py-8 lg:py-10">
          <Skeleton className="h-[500px] w-full rounded-lg" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!currentLesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shell py-12 lg:py-16 text-center">
          <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("lessonPage.notFoundTitle")}</h1>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            {t("lessonPage.backToCourse")}
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  // Check access
  if (!canAccessLesson(currentLesson)) {
    const purchaseOk = currentLesson.is_free || hasPurchased || course?.price === 0;
    const quizLock = purchaseOk ? getQuizLockFor(currentLesson) : null;

    if (quizLock) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <div className="shell py-12 lg:py-16 text-center">
            <Lock className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">{t("lessonPage.lockedByQuizTitle")}</h1>
            <p className="text-muted-foreground mb-6">
              {quizLock.afterLesson
                ? t("lessonPage.lockedByQuizDescription", {
                    quiz: quizLock.assignment.quiz?.title,
                    score: quizLock.assignment.quiz?.passing_score,
                    lesson: quizLock.afterLesson?.title,
                  })
                : t("lessonPage.lockedByQuizDescriptionNoLesson", {
                    quiz: quizLock.assignment.quiz?.title,
                    score: quizLock.assignment.quiz?.passing_score,
                  })}
            </p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => navigate(`/courses/${courseId}/quiz/${quizLock.assignment.quiz_id}`)}>
                {t("lessonPage.goToQuiz")}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/courses/${courseId}`)}>
                {t("lessonPage.backToCourse")}
              </Button>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="shell py-12 lg:py-16 text-center">
          <Lock className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">{t("lessonPage.lockedTitle")}</h1>
          <p className="text-muted-foreground mb-6">
            {t("lessonPage.lockedDescription")}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => navigate(`/courses/${courseId}`)}>
              {t("lessonPage.buyCourse")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/courses")}>
              {t("lessonPage.browseCourses")}
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col" dir={isRtl ? "rtl" : "ltr"}>
      <Header />

      <main className="flex-1">
        <div className="shell pb-24 pt-8 lg:pb-28 lg:pt-10">
          {/* Breadcrumb */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link to="/courses" className="hover:text-primary">{t("lessonPage.breadcrumbCourses")}</Link>
            <span>/</span>
            <Link to={`/courses/${courseId}`} className="hover:text-primary">{course?.title}</Link>
            <span>/</span>
            <span className="min-w-0 truncate text-foreground">{currentLesson.title}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Player */}
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden">
                <VideoEmbed url={currentLesson.video_url} title={currentLesson.title} captions={(currentLesson as any).captions} captionsUrl={(currentLesson as any).captions_url} />
              </Card>

              <ZoomLinksInlineManager lessonId={lessonId!} />

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4 space-y-2">
                  <h2 className="font-bold flex items-center gap-2">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    {t("lessonPage.zoomTitle")}
                  </h2>
                  {!user ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-background border text-sm text-muted-foreground">
                      <Lock className="h-4 w-4" />
                      {t("lessonPage.zoomLoginRequired")}
                    </div>
                  ) : zoomLoading ? (
                    <>
                      <Skeleton className="h-12 w-full rounded-lg" />
                      <Skeleton className="h-12 w-full rounded-lg" />
                    </>
                  ) : zoomError ? (
                    <div className="p-3 rounded-lg bg-background border text-sm text-destructive">
                      {t("lessonPage.zoomError")}
                    </div>
                  ) : !lessonZoomLinks || lessonZoomLinks.length === 0 ? (
                    <div className="p-3 rounded-lg bg-background border text-sm text-muted-foreground text-center">
                      {t("lessonPage.zoomEmpty")}
                    </div>
                  ) : (
                    lessonZoomLinks.map((z: any) => {
                      const when = z.scheduled_at ? new Date(z.scheduled_at).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" }) : null;
                      return (
                        <div key={z.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-background border">
                          <div className="flex-1 min-w-0 space-y-1">
                            <span className="font-medium truncate block">{z.title}</span>
                            {when && (
                              <div className="text-xs text-muted-foreground">
                                🗓️ {when}{z.duration_minutes ? ` • ${z.duration_minutes} ${t("lessonPage.minutesShort")}` : ""}
                              </div>
                            )}
                            {(z.meeting_id || z.passcode) && (
                              <div className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap" dir="ltr">
                                {z.meeting_id && <span>Meeting ID: {z.meeting_id}</span>}
                                {z.passcode && <span>Passcode: {z.passcode}</span>}
                              </div>
                            )}
                          </div>
                          <ZoomJoinButton url={z.url} title={z.title} zoomLinkId={z.id} courseId={courseId} lessonId={lessonId} />
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>




              {/* Lesson Info */}
              <Card>
                <CardContent className="p-6">
                  <h1 className="text-2xl font-bold text-foreground mb-2">
                    {currentLesson.title}
                  </h1>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {currentLesson.duration_minutes} {t("lessonPage.minutesShort")}
                    </span>
                    {currentLesson.is_free && (
                      <Badge variant="secondary">{t("lessonPage.freeLesson")}</Badge>
                    )}
                  </div>
                  {currentLesson.description && (
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      {currentLesson.description}
                    </p>
                  )}
                  {user && (
                    <Button
                      size="lg"
                      onClick={toggleLessonComplete}
                      disabled={markCompleteMutation.isPending || unmarkCompleteMutation.isPending}
                      className={
                        isLessonCompleted(lessonId!)
                          ? "w-full sm:w-auto gap-2 text-base font-bold bg-green-600 hover:bg-green-700 text-white shadow-md"
                          : "w-full sm:w-auto gap-2 text-base font-bold shadow-md shadow-primary/25 ring-2 ring-gold/40 ring-offset-2 ring-offset-background"
                      }
                    >
                      <Check className="h-5 w-5" />
                      {isLessonCompleted(lessonId!) ? t("lessonPage.completed") : t("lessonPage.markComplete")}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Lesson PDF */}
              {currentLesson.pdf_url && (() => {
                const embed = getVideoEmbed(currentLesson.pdf_url);
                const isGdrive = embed?.provider === "gdrive";
                const pdfSrc = isGdrive ? embed!.src : currentLesson.pdf_url;
                return (
                  <Card>
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          {t("lessonPage.pdfTitle")}
                        </h2>
                        <div className="flex items-center gap-2">
                          <Button asChild variant="outline" size="sm">
                            <a href={currentLesson.pdf_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="ml-2 h-4 w-4" />
                              {t("lessonPage.openNewWindow")}
                            </a>
                          </Button>
                          {!isGdrive && (
                            <Button asChild variant="default" size="sm">
                              <a href={currentLesson.pdf_url} download>
                                <Download className="ml-2 h-4 w-4" />
                                {t("lessonPage.download")}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="w-full aspect-[3/4] md:aspect-[4/3] rounded-lg overflow-hidden border bg-muted">
                        <iframe
                          src={pdfSrc}
                          title={`${currentLesson.title} - PDF`}
                          className="w-full h-full border-0"
                          allow="autoplay"
                        />
                      </div>
                      {isGdrive && (
                        <p className="text-xs text-muted-foreground">
                          {t("lessonPage.gdriveNotice")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}

              {/* Quiz Required Notice */}

              {blockingQuiz && nextLesson && (
                <Card className="border-blue-500/50 bg-blue-500/10">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-medium text-blue-700 mb-1">
                          {t("lessonPage.quizRequiredTitle")}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {t("lessonPage.quizRequiredDescription", {
                            quiz: blockingQuiz.quiz?.title,
                            score: blockingQuiz.quiz?.passing_score,
                          })}
                        </p>
                        <Button
                          onClick={() => navigate(`/courses/${courseId}/quiz/${blockingQuiz.quiz_id}`)}
                          size="sm"
                        >
                          <FileQuestion className="ml-2 h-4 w-4" />
                          {t("lessonPage.startQuiz")}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation */}
              <div className="flex justify-between">
                {prevLesson && canAccessLesson(prevLesson) ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/courses/${courseId}/lessons/${prevLesson.id}`)}
                  >
                    <ArrowRight className="ml-2 h-4 w-4" />
                    {t("lessonPage.prevLesson")}
                  </Button>
                ) : (
                  <div />
                )}
                {nextLesson && canAccessLesson(nextLesson) ? (
                  blockingQuiz ? (
                    <Button
                      variant="secondary"
                      onClick={() => navigate(`/courses/${courseId}/quiz/${blockingQuiz.quiz_id}`)}
                    >
                      <FileQuestion className="ml-2 h-4 w-4" />
                      {t("lessonPage.solveQuizFirst")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => navigate(`/courses/${courseId}/lessons/${nextLesson.id}`)}
                    >
                      {t("lessonPage.nextLesson")}
                      <ArrowLeft className="mr-2 h-4 w-4" />
                    </Button>
                  )
                ) : (
                  <div />
                )}
              </div>
            </div>

            {/* Sidebar - Course Content */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardContent className="p-0">
                  <div className="p-4 border-b space-y-2">
                    <h3 className="font-bold text-foreground">{t("lessonPage.courseContent")}</h3>
                    {user && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{t("lessonPage.progress")}</span>
                          <span>{t("lessonPage.progressCount", { completed: completedCount, total: totalLessons, percent: progressPercent })}</span>
                        </div>
                        <Progress value={progressPercent} className="h-2" />
                      </div>
                    )}
                  </div>
                  <ScrollArea className="h-[450px]">
                    <div className="p-2">
                      {sections?.map((section) => (
                        <div key={section.id} className="mb-2">
                          <button
                            onClick={() => toggleSection(section.id)}
                            className="w-full flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-right"
                          >
                            <span className="font-medium text-sm">{section.title}</span>
                            {expandedSections.includes(section.id) ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                          
                          {expandedSections.includes(section.id) && (
                            <ul className="mt-1 space-y-1">
                              {section.lessons.map((lesson) => {
                                const isActive = lesson.id === lessonId;
                                const canAccess = canAccessLesson(lesson);
                                
                                return (
                                  <li key={lesson.id}>
                                    <button
                                      onClick={() => handleLessonClick(lesson)}
                                      disabled={!canAccess}
                                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                                        isActive
                                          ? "bg-brand-soft text-foreground ring-1 ring-inset ring-primary/25"
                                          : canAccess
                                          ? "hover:bg-muted/70"
                                          : "opacity-50 cursor-not-allowed"
                                      }`}
                                    >
                                      {canAccess ? (
                                        isLessonCompleted(lesson.id) ? (
                                          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-500" />
                                        ) : isActive ? (
                                          <PlayCircle className="h-4 w-4 flex-shrink-0" />
                                        ) : (
                                          <PlayCircle className="h-4 w-4 flex-shrink-0 opacity-50" />
                                        )
                                      ) : (
                                        <Lock className="h-4 w-4 flex-shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className={`break-words text-sm leading-snug ${isActive ? "font-semibold text-primary" : "font-medium"}`}>
                                          {lesson.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {lesson.duration_minutes} {t("lessonPage.minutesShort")}
                                        </p>
                                      </div>
                                      {lesson.is_free && !isActive && (
                                        <Badge variant="outline" className="text-xs flex-shrink-0">
                                          {t("lessonPage.free")}
                                        </Badge>
                                      )}
                                    </button>
                                  </li>
                                );
                              })}

                              {/* Per-lesson quizzes: shown right after their specific lesson */}
                              {section.lessons.map((lesson) => {
                                const lessonQuiz = quizAssignments?.find(
                                  (q) => q.quiz_type !== "final" && q.lesson_id === lesson.id
                                );
                                if (!lessonQuiz) return null;
                                const isPassed = passedQuizzes.includes(lessonQuiz.quiz_id);
                                return (
                                  <li key={lessonQuiz.id}>
                                    <button
                                      onClick={() => navigate(`/courses/${courseId}/quiz/${lessonQuiz.quiz_id}`)}
                                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                                        isPassed
                                          ? "bg-green-500/10 hover:bg-green-500/20"
                                          : "bg-blue-500/10 hover:bg-blue-500/20"
                                      }`}
                                    >
                                      {isPassed ? (
                                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                                      ) : (
                                        <FileQuestion className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium break-words leading-snug">
                                          {t("lessonPage.quizLabel", { title: lessonQuiz.quiz?.title })}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {isPassed
                                            ? t("lessonPage.quizPassed")
                                            : t("lessonPage.afterLesson", { lesson: lesson.title, score: lessonQuiz.quiz?.passing_score })}
                                        </p>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}

                              {/* Section Quizzes (legacy whole-section quizzes) */}
                              {quizAssignments?.filter(q => q.section_id === section.id && q.quiz_type !== "final" && !q.lesson_id).map((assignment) => {
                                const isPassed = passedQuizzes.includes(assignment.quiz_id);
                                return (
                                  <li key={assignment.id}>
                                    <button
                                      onClick={() => navigate(`/courses/${courseId}/quiz/${assignment.quiz_id}`)}
                                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                                        isPassed
                                          ? "bg-green-500/10 hover:bg-green-500/20"
                                          : "bg-blue-500/10 hover:bg-blue-500/20"
                                      }`}
                                    >
                                      {isPassed ? (
                                        <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                                      ) : (
                                        <FileQuestion className="h-4 w-4 flex-shrink-0 text-blue-600" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium break-words leading-snug">
                                          {assignment.quiz?.title}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {isPassed ? t("lessonPage.quizPassed") : t("lessonPage.passingScore", { score: assignment.quiz?.passing_score })}
                                        </p>
                                      </div>
                                    </button>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      ))}

                      {/* Final exam: unlocked only once every lesson is completed */}
                      {quizAssignments?.filter((q) => q.quiz_type === "final").map((assignment) => {
                        const isPassed = passedQuizzes.includes(assignment.quiz_id);
                        const allDone = totalLessons > 0 && completedCount >= totalLessons;
                        return (
                          <div key={assignment.id} className="mt-3 pt-3 border-t">
                            <button
                              onClick={() => allDone && navigate(`/courses/${courseId}/quiz/${assignment.quiz_id}`)}
                              disabled={!allDone}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                                !allDone
                                  ? "opacity-50 cursor-not-allowed bg-muted/50"
                                  : isPassed
                                  ? "bg-green-500/10 hover:bg-green-500/20"
                                  : "bg-amber-500/10 hover:bg-amber-500/20"
                              }`}
                            >
                              {!allDone ? (
                                <Lock className="h-4 w-4 flex-shrink-0" />
                              ) : isPassed ? (
                                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                              ) : (
                                <FileQuestion className="h-4 w-4 flex-shrink-0 text-amber-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium break-words leading-snug">
                                  {t("lessonPage.finalExamLabel", { title: assignment.quiz?.title })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {!allDone
                                    ? t("lessonPage.finalExamLocked")
                                    : isPassed
                                    ? t("lessonPage.quizPassed")
                                    : t("lessonPage.passingScore", { score: assignment.quiz?.passing_score })}
                                </p>
                              </div>
                            </button>
                          </div>
                        );
                      })}

                      {/* Course survey/form: same unlock rule as the final exam */}
                      {courseForms.map((form) => {
                        const allDone = totalLessons > 0 && completedCount >= totalLessons;
                        const isAnswered = answeredFormIds.includes(form.id);
                        return (
                          <div key={form.id} className="mt-3 pt-3 border-t">
                            <button
                              onClick={() => allDone && navigate(`/dashboard/forms/${form.id}/fill`)}
                              disabled={!allDone}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg text-right transition-colors ${
                                !allDone
                                  ? "opacity-50 cursor-not-allowed bg-muted/50"
                                  : isAnswered
                                  ? "bg-green-500/10 hover:bg-green-500/20"
                                  : "bg-blue-500/10 hover:bg-blue-500/20"
                              }`}
                            >
                              {!allDone ? (
                                <Lock className="h-4 w-4 flex-shrink-0" />
                              ) : isAnswered ? (
                                <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
                              ) : (
                                <FileQuestion className="h-4 w-4 flex-shrink-0 text-blue-600" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium break-words leading-snug">{form.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {!allDone
                                    ? t("lessonPage.finalExamLocked")
                                    : isAnswered
                                    ? "تم الرد على الاستبيان"
                                    : "استبيان رأيك في الدورة التدريبية"}
                                </p>
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LessonPage;
