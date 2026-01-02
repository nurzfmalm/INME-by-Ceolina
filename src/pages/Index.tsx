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
import { CenterAuth } from "@/components/CenterAuth";
import { ChildAuth } from "@/components/ChildAuth";
import { ChildrenManager } from "@/components/ChildrenManager";
import { PhotoAnalysis } from "@/components/PhotoAnalysis";
import { useUserRole } from "@/hooks/useUserRole";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const { role, loading: roleLoading } = useUserRole();
  const [selectedRole, setSelectedRole] = useState<"center" | "child" | null>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);
  const [childData, setChildData] = useState<OnboardingData | null>(null);
  const [currentSection, setCurrentSection] = useState<string>("dashboard");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskPrompt, setCurrentTaskPrompt] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  
  // New: selected child for specialists
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [selectedChildName, setSelectedChildName] = useState<string>("Ребёнок");
  const [selectedChildAge, setSelectedChildAge] = useState<number | null>(null);

  const loadUserData = async () => {
    setDataLoading(true);
    try {
      // For specialists (parent role), check if they have children
      if (role === "parent") {
        const { data: children } = await supabase
          .from("children")
          .select("id, name")
          .eq("user_id", user!.id)
          .limit(1);

        if (children && children.length > 0) {
          // Auto-select first child if none selected
          if (!selectedChildId) {
            setSelectedChildId(children[0].id);
            setSelectedChildName(children[0].name);
          }
          setOnboardingComplete(true);
          setDiagnosticComplete(true);
          
          // Set child data for display
          setChildData({
            childName: selectedChildName,
            childAge: "",
            communicationLevel: "",
            emotionalLevel: "",
            goals: "",
          });
        }
      } else if (role === "child") {
        // Child role - load from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle();

        if (profile) {
          const userData: OnboardingData = {
            childName: profile.child_name || "Ребёнок",
            childAge: String(profile.child_age || ""),
            communicationLevel: "",
            emotionalLevel: "",
            goals: "",
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
      setDataLoading(false);
    } else if (!user) {
      setDataLoading(false);
    }
  }, [user, roleLoading, role, selectedChildId]);

  const handleChildSelect = (childId: string, childName: string) => {
    setSelectedChildId(childId);
    setSelectedChildName(childName);
    setChildData({
      childName,
      childAge: "",
      communicationLevel: "",
      emotionalLevel: "",
      goals: "",
    });
    setCurrentSection("dashboard");
    toast.success(`Выбран профиль: ${childName}`);
  };

  const handleOnboardingComplete = (data: OnboardingData) => {
    setChildData(data);
    setOnboardingComplete(true);
  };

  const handleDiagnosticComplete = async (assessmentId: string) => {
    console.log("Diagnostic completed:", assessmentId);

    try {
      const loadingToast = toast.loading('🤖 Gemini AI создаёт персональную программу обучения...');

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

      const learningPath = await generateLearningPath(
        assessment as any,
        childData?.childName || 'ребёнок',
        childData?.childAge ? parseInt(childData.childAge) : 6
      );

      toast.dismiss(loadingToast);

      console.log("Learning path generated with Gemini:", learningPath);
      toast.success('✨ Персональная программа готова!');

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      if (userId) {
        const { error: saveError } = await supabase
          .from("learning_paths")
          .upsert({
            user_id: userId,
            child_id: selectedChildId,
            path_data: learningPath as any,
            total_weeks: learningPath.weeks?.length || 12,
            current_week: 1,
            completion_percentage: 0
          }, {
            onConflict: 'user_id'
          });

        if (saveError) {
          console.error("Error saving learning path:", saveError);
        }
      }

      localStorage.setItem('learningPath', JSON.stringify(learningPath));

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
  if (!user && selectedRole === "center") {
    return <CenterAuth onBack={() => setSelectedRole(null)} />;
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

  // Specialist (parent) role - show children manager if no child selected
  if (role === "parent") {
    if (currentSection === "children") {
      return (
        <ChildrenManager
          onBack={() => setCurrentSection("dashboard")}
          onSelectChild={handleChildSelect}
          selectedChildId={selectedChildId}
        />
      );
    }

    // If no children exist, show children manager
    if (currentSection === "children" || (!selectedChildId && !dataLoading)) {
      return (
        <ChildrenManager
          onBack={() => setCurrentSection("dashboard")}
          onSelectChild={handleChildSelect}
          selectedChildId={selectedChildId}
          onStartDiagnostic={(childId, childName, childAge) => {
            setSelectedChildId(childId);
            setSelectedChildName(childName);
            setSelectedChildAge(childAge);
            setCurrentSection("diagnostic");
          }}
          onViewLearningPath={(childId, childName) => {
            setSelectedChildId(childId);
            setSelectedChildName(childName);
            setCurrentSection("learning-path");
          }}
        />
      );
    }

    if (currentSection === "diagnostic") {
      return (
        <AdaptiveDiagnostic
          onComplete={() => {
            setCurrentSection("learning-path");
          }}
          onBack={() => setCurrentSection("children")}
          childId={selectedChildId || undefined}
          childName={selectedChildName}
          childAge={selectedChildAge}
        />
      );
    }

    if (currentSection === "parent-dashboard") {
      return (
        <ParentDashboard
          onBack={() => setCurrentSection("dashboard")}
          childName={selectedChildName}
        />
      );
    }
  }

  // Child role restrictions
  if (role === "child") {
    if (["parent-dashboard", "settings", "analytics", "learning-path", "photo-analysis", "children"].includes(currentSection)) {
      toast.error("Доступ запрещён");
      setCurrentSection("dashboard");
    }
  }

  // For specialists without completed setup or children without onboarding
  if (!onboardingComplete || !childData) {
    if (role === "parent") {
      // Specialists don't need onboarding, redirect to children manager
      return (
        <ChildrenManager
          onBack={() => {}}
          onSelectChild={handleChildSelect}
          selectedChildId={null}
        />
      );
    }
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (!diagnosticComplete && role === "child") {
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
    return (
      <LearningPath 
        onBack={() => setCurrentSection("dashboard")} 
        childId={selectedChildId || undefined}
        childName={selectedChildName}
      />
    );
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

  return (
    <Dashboard
      childData={childData}
      onNavigate={handleNavigate}
      userRole={role}
      selectedChildId={selectedChildId}
      onChangeChild={() => setCurrentSection("children")}
    />
  );
};

export default Index;
