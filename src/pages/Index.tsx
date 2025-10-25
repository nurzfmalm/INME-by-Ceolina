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
import { AIAssistant } from "@/components/AIAssistant";

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

  if (currentSection === "ai-assistant") {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setCurrentSection("dashboard")}
            className="mb-4 text-sm text-muted-foreground hover:text-foreground"
          >
            ← Назад
          </button>
          <AIAssistant />
        </div>
      </div>
    );
  }

  return <Dashboard childData={childData} onNavigate={handleNavigate} />;
};

export default Index;
