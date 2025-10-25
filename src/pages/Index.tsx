import { useState } from "react";
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

const Index = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [diagnosticComplete, setDiagnosticComplete] = useState(false);
  const [childData, setChildData] = useState<OnboardingData | null>(null);
  const [currentSection, setCurrentSection] = useState<string>("dashboard");
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [currentTaskPrompt, setCurrentTaskPrompt] = useState<string | null>(null);

  const handleOnboardingComplete = (data: OnboardingData) => {
    setChildData(data);
    setOnboardingComplete(true);
  };

  const handleDiagnosticComplete = async (assessmentId: string) => {
    console.log("Diagnostic completed:", assessmentId);
    
    // Generate learning path
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        toast.promise(
          supabase.functions.invoke('generate-learning-path', {
            body: { assessmentId }
          }),
          {
            loading: 'Создаём персональную программу...',
            success: 'Программа готова!',
            error: 'Ошибка создания программы',
          }
        );
      }
    } catch (error) {
      console.error("Error generating learning path:", error);
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

  return <Dashboard childData={childData} onNavigate={handleNavigate} />;
};

export default Index;
