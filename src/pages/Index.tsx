import { useState } from "react";
import { Onboarding, OnboardingData } from "@/components/Onboarding";
import { Dashboard } from "@/components/Dashboard";
import { ArtTherapy } from "@/components/ArtTherapy";
import { Gallery } from "@/components/Gallery";

const Index = () => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [childData, setChildData] = useState<OnboardingData | null>(null);
  const [currentSection, setCurrentSection] = useState<string>("dashboard");

  const handleOnboardingComplete = (data: OnboardingData) => {
    setChildData(data);
    setOnboardingComplete(true);
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
  };

  if (!onboardingComplete || !childData) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (currentSection === "art-therapy") {
    return (
      <ArtTherapy
        onBack={() => setCurrentSection("dashboard")}
        childName={childData.childName}
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

  return <Dashboard childData={childData} onNavigate={handleNavigate} />;
};

export default Index;
