import { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Loader2, ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DrawingObservationForm } from "./DrawingObservationForm";
import { AnalysisReportComponent } from "./AnalysisReport";
import type { DrawingObservation, AnalysisReport } from "@/lib/analysis-types";

interface PhotoAnalysisProps {
  onBack: () => void;
  userId: string;
  childName: string;
}

type AnalysisStep = "upload" | "observation" | "analyzing" | "result";

export const PhotoAnalysis = ({ onBack, userId, childName }: PhotoAnalysisProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [step, setStep] = useState<AnalysisStep>("upload");
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [previousDrawings, setPreviousDrawings] = useState<any[]>([]);
  const [childAge, setChildAge] = useState<number>(7);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load previous drawings and child age
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get child profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('child_age')
          .eq('id', userId)
          .maybeSingle();
        
        if (profile?.child_age) {
          setChildAge(profile.child_age);
        }

        // Get previous drawings
        const { data: artworks } = await supabase
          .from('artworks')
          .select('id, created_at, metadata')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (artworks) {
          setPreviousDrawings(artworks);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, [userId]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
        setStep("observation");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleObservationSubmit = async (observation: DrawingObservation) => {
    if (!selectedImage) return;

    setStep("analyzing");
    
    try {
      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}.png`;
      const blob = await fetch(selectedImage).then(r => r.blob());

      const { error: uploadError } = await supabase.storage
        .from('artworks')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(fileName);

      // Call deep analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-drawing-deep', {
        body: {
          imageData: selectedImage,
          observation,
          previousDrawings: previousDrawings.length > 0 ? previousDrawings : undefined
        }
      });

      if (analysisError) {
        console.error("Analysis error:", analysisError);
        throw new Error(analysisError.message || "Ошибка анализа");
      }

      if (!analysisData?.report) {
        throw new Error("Не удалось получить результаты анализа");
      }

      const analysisReport = analysisData.report;

      // Save to database - use JSON parse/stringify to ensure Json compatibility
      const { error: saveError } = await supabase
        .from('artworks')
        .insert([{
          user_id: userId,
          image_url: publicUrl,
          storage_path: fileName,
          metadata: JSON.parse(JSON.stringify({
            source: 'photo_upload',
            deep_analysis: analysisReport,
            observation_data: observation,
            visual_validation: analysisData.visualValidation,
            analyzed_at: new Date().toISOString(),
          })),
          colors_used: analysisReport.visual_description?.colors_used?.map((c: any) => c.color) || [],
          emotions_used: analysisReport.interpretation?.emotional_themes?.map((t: any) => t.theme) || []
        }]);

      if (saveError) throw saveError;

      setReport(analysisReport);
      setStep("result");
      toast.success("Глубокий анализ завершён!");
    } catch (error: any) {
      console.error("Ошибка анализа:", error);
      toast.error("Ошибка при анализе: " + (error.message || "Неизвестная ошибка"));
      setStep("observation");
    }
  };

  const resetAnalysis = () => {
    setSelectedImage(null);
    setReport(null);
    setStep("upload");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={step === "upload" ? onBack : resetAnalysis}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === "upload" ? "Назад" : "Новый анализ"}
          </Button>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Глубокий анализ рисунка</h1>
          </div>
        </div>

        {/* Step indicator */}
        {step !== "result" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className={`h-2 w-16 rounded-full ${step === "upload" ? "bg-primary" : "bg-primary/30"}`} />
            <div className={`h-2 w-16 rounded-full ${step === "observation" ? "bg-primary" : step === "analyzing" ? "bg-primary" : "bg-muted"}`} />
            <div className={`h-2 w-16 rounded-full ${step === "analyzing" ? "bg-primary animate-pulse" : "bg-muted"}`} />
          </div>
        )}

        {/* Upload Step */}
        {step === "upload" && (
          <Card className="p-8">
            <div className="text-center space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">Шаг 1: Загрузите рисунок</h2>
                <p className="text-muted-foreground">
                  Сделайте снимок или выберите фото рисунка {childName} для глубокого AI-анализа
                </p>
              </div>

              <div className="grid gap-4">
                <Button
                  size="lg"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-24"
                >
                  <Camera className="mr-2 h-6 w-6" />
                  Сделать фото
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-24"
                >
                  <Upload className="mr-2 h-6 w-6" />
                  Выбрать из галереи
                </Button>
              </div>

              {previousDrawings.length > 0 && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    У вас есть {previousDrawings.length} предыдущих рисунков. 
                    Анализ будет включать сравнение с прогрессом.
                  </p>
                </div>
              )}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                className="hidden"
              />

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </Card>
        )}

        {/* Observation Step */}
        {step === "observation" && selectedImage && (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Выбранный рисунок"
                  className="w-full h-auto max-h-64 object-contain rounded-lg bg-muted"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={resetAnalysis}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            <div>
              <h2 className="text-xl font-semibold mb-2">Шаг 2: Форма наблюдений</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Заполните данные о процессе рисования для качественного анализа
              </p>
            </div>

            <DrawingObservationForm
              childId={userId}
              childAge={childAge}
              onSubmit={handleObservationSubmit}
              strokeCount={0}
              averagePressure={5}
              eraserUsage={0}
              durationSeconds={0}
              isPhotoUpload={true}
            />
          </div>
        )}

        {/* Analyzing Step */}
        {step === "analyzing" && (
          <Card className="p-12">
            <div className="text-center space-y-6">
              <Loader2 className="h-16 w-16 animate-spin mx-auto text-primary" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Глубокий анализ...</h2>
                <p className="text-muted-foreground">
                  AI анализирует рисунок с учётом данных наблюдений
                </p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>1. Валидация визуального распознавания</p>
                <p>2. Мультифакторный анализ</p>
                <p>3. Сравнение с предыдущими рисунками</p>
                <p>4. Формирование рекомендаций</p>
              </div>
            </div>
          </Card>
        )}

        {/* Result Step */}
        {step === "result" && report && (
          <div className="space-y-4">
            {selectedImage && (
              <Card className="p-4">
                <img
                  src={selectedImage}
                  alt="Проанализированный рисунок"
                  className="w-full h-auto max-h-48 object-contain rounded-lg bg-muted"
                />
              </Card>
            )}
            
            <AnalysisReportComponent report={report} />

            <div className="flex gap-4">
              <Button onClick={resetAnalysis} className="flex-1">
                Загрузить другой рисунок
              </Button>
              <Button variant="outline" onClick={onBack} className="flex-1">
                Вернуться в меню
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
