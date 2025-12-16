import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateLearningPath } from "@/lib/gemini";
import { Onboarding, OnboardingData } from "@/components/Onboarding";
import { AdaptiveDiagnostic } from "@/components/AdaptiveDiagnostic";
import { Dashboard } from "@/components/Dashboard";
import { ArtTherapy } from "@/components/ArtTherapy";
import { Gallery } from "@/components/Gallery";
import { Analytics } from "@/components/Analytics";
import { Tasks } from "@/components/Tasks";
import { Rewards } from "@/components/Rewards";
import { DualDrawing } from "@/components/DualDrawing";
import { LearningPath } from "@/components/LearningPath";
import { ParentDashboard } from "@/components/ParentDashboard";
import { SensorySettings } from "@/components/SensorySettings";
import { RoleSelection } from "@/components/RoleSelection";
import { ParentAuth } from "@/components/ParentAuth";
import { ChildAuth } from "@/components/ChildAuth";
import { PhotoAnalysis } from "@/components/PhotoAnalysis";
import { useUserRole } from "@/hooks/useUserRole";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole();
  const [selectedRole, setSelectedRole] = useState<"parent" | "child" | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);
  const [childData, setChildData] = useState<OnboardingData | null>(null);
  const [currentSection, setCurrentSection] = useState<string>("dashboard");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskPrompt, setCurrentTaskPrompt] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const loadUserData = async () => {
    setDataLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .maybeSingle();

      if (profile) {
        // Check if this is a child with parent data
        if (role === "child" && profile.parent_user_id) {
          // Load parent's profile to get child data
          const { data: parentProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", profile.parent_user_id)
            .single();

          if (parentProfile) {
            // Use parent's data for the child
            const userData: OnboardingData = {
              childName: profile.child_name || parentProfile.child_name || "Ребёнок",
              childAge: String(profile.child_age || parentProfile.child_age || ""),
              communicationLevel: "",
              emotionalLevel: "",
              goals: ""
            };
            setChildData(userData);

            // Check if assessment exists
            const { data: assessment } = await supabase
              .from("adaptive_assessments")
              .select("*")
              .eq("user_id", profile.parent_user_id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (assessment && assessment.completed) {
              setOnboardingComplete(true);
              setDiagnosticComplete(true);
              toast.success(`Добро пожаловать, ${userData.childName}!`);
            }
          }
        } else if (role === "parent" && profile.child_name) {
          // Parent with existing data
          const userData: OnboardingData = {
            childName: profile.child_name,
            childAge: String(profile.child_age || ""),
            communicationLevel: "",
            emotionalLevel: "",
            goals: ""
          };
          setChildData(userData);

          // Check if assessment exists
          const { data: assessment } = await supabase
            .from("adaptive_assessments")
            .select("*")
            .eq("user_id", user!.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (assessment && assessment.completed) {
            setOnboardingComplete(true);
            setDiagnosticComplete(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load data for authenticated users
  useEffect(() => {
    if (user && !roleLoading && role) {
      loadUserData();
    } else if (user && !roleLoading && !role) {
      // User has no role yet
      setDataLoading(false);
    } else if (!user) {
      setDataLoading(false);
    }
  }, [user, roleLoading, role]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setChildData(data);
    setOnboardingComplete(true);
  };

  const handleDiagnosticComplete = async (assessmentId: string) => {
  console.log("Diagnostic completed:", assessmentId);

  // Generate learning path with Gemini AI
  try {
    const loadingToast = toast.loading('🤖 Gemini AI создаёт персональную программу обучения...');

    // Получить данные assessment из базы
    const { data: assessment, error: assessmentError } = await supabase
      .from("adaptive_assessments")
      .select("*")
      .eq("id", assessmentId)
      .single();

    if (assessmentError) {
      console.error("Error fetching assessment:", assessmentError);
      toast.dismiss(loadingToast);
      toast.error('Не удалось получить данные диагностики');
      setDiagnosticComplete(true);
      return;
    }

    // Генерация программы обучения с Gemini
    const learningPath = await generateLearningPath(
      assessment as any, // assessment_data is Json type from DB
      childData?.childName || 'ребёнок',
      childData?.childAge ? parseInt(childData.childAge) : 6
    );

    toast.dismiss(loadingToast);

    console.log("Learning path generated with Gemini:", learningPath);
    toast.success('✨ Персональная программа готова!');

    // Save to database
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;

    if (userId) {
      const { error: saveError } = await supabase
        .from("learning_paths")
        .upsert({
          user_id: userId,
          path_data: learningPath as any, // Convert to Json type for DB
          total_weeks: learningPath.weeks?.length || 12,
          current_week: 1,
          completion_percentage: 0
        }, {
          onConflict: 'user_id'
        });

      if (saveError) {
        console.error("Error saving learning path:", saveError);
      } else {
        console.log("Learning path saved to database");
      }
    }

    // Save to localStorage as backup
    localStorage.setItem('learningPath', JSON.stringify(learningPath));
    console.log("Learning path saved to localStorage");

  } catch (error) {
    console.error("Error generating learning path:", error);
    toast.error('Ошибка создания программы. Попробуйте ещё раз.');
  }

  setDiagnosticComplete(true);
};

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
  };

  const handleStartTask = (taskId: string, prompt: string) => {
    setCurrentTaskId(taskId);
    setCurrentTaskPrompt(prompt);
    setCurrentSection("art-therapy");
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show role selection if not authenticated
  if (!user && !selectedRole) {
    return <RoleSelection onSelectRole={setSelectedRole} />;
  }

  // Show auth screens based on selected role
  if (!user && selectedRole === "parent") {
    return <ParentAuth onBack={() => setSelectedRole(null)} />;
  }

  if (!user && selectedRole === "child") {
    return <ChildAuth onBack={() => setSelectedRole(null)} />;
  }

  // Loading role or data
  if (user && (roleLoading || dataLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Parent role can access everything
  if (role === "parent") {
    if (currentSection === "parent-dashboard") {
      return (
        <ParentDashboard
          onBack={() => setCurrentSection("dashboard")}
          childName={childData?.childName || "Ребёнок"}
        />
      );
    }
  }

  // If user is authenticated but has no role, show role selection (after data loading)
  if (user && !roleLoading && !role && !dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex flex-col items-center justify-center p-4">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Добро пожаловать!</h2>
          <p className="text-muted-foreground">Выберите свою роль для продолжения</p>
        </div>
        <RoleSelection onSelectRole={async (selectedRole) => {
          try {
            const { error } = await supabase.from("user_roles").upsert({
              user_id: user.id,
              role: selectedRole,
            }, {
              onConflict: 'user_id'
            });
            
            if (error) {
              console.error("Error setting role:", error);
              toast.error("Ошибка установки роли");
            } else {
              toast.success("Роль установлена!");
              window.location.reload();
            }
          } catch (error) {
            console.error("Error:", error);
            toast.error("Ошибка");
          }
        }} />
      </div>
    );
  }

  // Child role restrictions
  if (role === "child") {
    // Block access to parent dashboard, settings, analytics, learning path, photo-analysis
    if (["parent-dashboard", "settings", "analytics", "learning-path", "photo-analysis"].includes(currentSection)) {
      toast.error("Доступ запрещён");
      setCurrentSection("dashboard");
    }
  }

  if (!onboardingComplete || !childData) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (!diagnosticComplete) {
    return (
      <AdaptiveDiagnostic
        onComplete={handleDiagnosticComplete}
        onBack={() => setOnboardingComplete(false)}
      />
    );
  }

  if (currentSection === "art-therapy") {
    return (
      <ArtTherapy
        onBack={() => {
          setCurrentSection("dashboard");
          setCurrentTaskId(null);
          setCurrentTaskPrompt(null);
        }}
        childName={childData.childName}
        taskId={currentTaskId}
        taskPrompt={currentTaskPrompt}
      />
    );
  }

  if (currentSection === "gallery") {
    return (
      <Gallery
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "analytics") {
    return (
      <Analytics
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "tasks") {
    return (
      <Tasks
        onBack={() => setCurrentSection("dashboard")}
        onStartTask={handleStartTask}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "dual-drawing") {
    return (
      <DualDrawing
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "rewards") {
    return (
      <Rewards
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "settings") {
    return <SensorySettings onBack={() => setCurrentSection("dashboard")} />;
  }

  if (currentSection === "learning-path") {
    return <LearningPath onBack={() => setCurrentSection("dashboard")} />;
  }

  if (currentSection === "parent-dashboard") {
    return (
      <ParentDashboard
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
      />
    );
  }

  if (currentSection === "photo-analysis") {
    return (
      <PhotoAnalysis
        onBack={() => setCurrentSection("dashboard")}
        userId={user!.id}
        childName={childData.childName}
      />
    );
  }

  return <Dashboard childData={childData} onNavigate={handleNavigate} userRole={role} />;
};

export default Index;
