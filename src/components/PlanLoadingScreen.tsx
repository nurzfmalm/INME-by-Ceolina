import { useState, useEffect } from "react";
import { CircularProgress } from "@/components/ui/CircularProgress";
import classroomBackground from "@/assets/classroom-background.png";
import graduationCap from "@/assets/graduation-cap.png";
import pencil from "@/assets/pencil.png";

interface PlanLoadingScreenProps {
  onComplete: () => void;
}

export const PlanLoadingScreen = ({ onComplete }: PlanLoadingScreenProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(onComplete, 500);
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 safe-area-inset relative overflow-hidden">
      {/* Background image layer */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${classroomBackground})` }}
      />
      
      {/* White blurred overlay */}
      <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px]" />
      
      {/* Card */}
      <div className="relative z-10 w-full max-w-sm bg-white rounded-3xl p-8 shadow-lg text-center">
        {/* Decorative graduation cap - left */}
        <img 
          src={graduationCap} 
          alt="" 
          className="absolute -left-8 -top-6 w-20 h-auto -rotate-12 pointer-events-none"
        />
        
        {/* Decorative pencil - right */}
        <img 
          src={pencil} 
          alt="" 
          className="absolute -right-6 -top-4 w-16 h-auto rotate-12 pointer-events-none"
        />

        <h1 className="text-xl font-semibold text-gray-800 mb-8">
          Создаем персональный<br />план...
        </h1>
        
        <CircularProgress value={progress} size={180} strokeWidth={12} />
        
        <p className="text-gray-400 mt-8 italic">
          Подождите немного...
        </p>
      </div>
    </div>
  );
};
