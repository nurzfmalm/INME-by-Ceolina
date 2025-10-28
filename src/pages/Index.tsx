import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
    }
  }, [user, roleLoading, role]);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setChildData(data);
    setOnboardingComplete(true);
  };

  const handleDiagnosticComplete = async (assessmentId: string) => {
    console.log("Diagnostic completed:", assessmentId);
    
    // Generate learning path with AI
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;
      
      const loadingToast = toast.loading('🤖 AI создаёт персональную программу обучения...');
      
      const { data, error } = await supabase.functions.invoke('generate-learning-path', {
        body: { 
          assessmentId,
          userId 
        }
      });

      toast.dismiss(loadingToast);
      
      if (error) {
        console.error("Error generating learning path:", error);
        toast.error('Не удалось создать программу. Попробуйте позже.');
      } else {
        console.log("Learning path generated:", data);
        toast.success('✨ Персональная программа готова!');
        
        // Save to localStorage for all users (as backup)
        if (data.learningPath) {
          localStorage.setItem('learningPath', JSON.stringify(data.learningPath));
          console.log("Saved learning path to localStorage");
        }
      }
    } catch (error) {
      console.error("Error generating learning path:", error);
      toast.error('Ошибка создания программы');
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

  // Loading role
  if (user && roleLoading) {
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

  const loadUserData = async () => {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

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
              .single();

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
            .single();

          if (assessment && assessment.completed) {
            setOnboardingComplete(true);
            setDiagnosticComplete(true);
          }
        }
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  // Child role restrictions
  if (role === "child") {
    // Block access to parent dashboard, settings, analytics, learning path
    if (["parent-dashboard", "settings", "analytics", "learning-path"].includes(currentSection)) {
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

  return <Dashboard childData={childData} onNavigate={handleNavigate} userRole={role} />;
};

export default Index;
