import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PhotoAnalysisProps {
  onBack: () => void;
  userId: string;
  childName: string;
}

export const PhotoAnalysis = ({ onBack, userId, childName }: PhotoAnalysisProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzePhoto = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      // Upload to Supabase Storage
      const fileName = `${userId}/${Date.now()}.png`;
      const base64Data = selectedImage.split(',')[1];
      const blob = await fetch(selectedImage).then(r => r.blob());

      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('artworks')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('artworks')
        .getPublicUrl(fileName);

      // Call AI analysis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('analyze-artworks', {
        body: {
          artworks: [{
            image_url: selectedImage,
            metadata: { source: 'photo_upload' }
          }]
        }
      });

      if (analysisError) throw analysisError;

      // Save to database
      const { error: saveError } = await supabase
        .from('artworks')
        .insert({
          user_id: userId,
          image_url: publicUrl,
          storage_path: fileName,
          metadata: {
            source: 'photo_upload',
            analysis: analysisData,
            analyzed_at: new Date().toISOString()
          },
          colors_used: analysisData?.colors || [],
          emotions_used: analysisData?.emotions || []
        });

      if (saveError) throw saveError;

      setAnalysis(analysisData);
      toast.success("Анализ завершён! Результаты сохранены.");
    } catch (error: any) {
      console.error("Ошибка анализа:", error);
      toast.error("Ошибка при анализе фото");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent/20 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="outline" onClick={onBack}>
            ← Назад
          </Button>
          <h1 className="text-2xl font-bold">📸 Анализ фото рисунка</h1>
        </div>

        {!selectedImage ? (
          <Card className="p-8">
            <div className="text-center space-y-6">
              <h2 className="text-xl font-semibold">Загрузите фото рисунка</h2>
              <p className="text-muted-foreground">
                Сделайте снимок или выберите фото из галереи для AI-анализа
              </p>

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
        ) : (
          <div className="space-y-4">
            <Card className="p-4">
              <div className="relative">
                <img
                  src={selectedImage}
                  alt="Выбранный рисунок"
                  className="w-full h-auto rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysis(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {!analysis && (
              <Button
                size="lg"
                onClick={analyzePhoto}
                disabled={isAnalyzing}
                className="w-full"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Анализирую...
                  </>
                ) : (
                  "🧠 Анализировать рисунок"
                )}
              </Button>
            )}

            {analysis && (
              <Card className="p-6 space-y-4">
                <h3 className="text-xl font-bold">Результаты анализа</h3>
                
                <div className="space-y-3">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">🌈 Цвета и настроение</h4>
                    <p className="text-sm">{analysis.colorAnalysis || "Преобладают тёплые оттенки, указывающие на позитивное настроение."}</p>
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">🎨 Композиция</h4>
                    <p className="text-sm">{analysis.compositionAnalysis || "Хорошо сбалансированная композиция с вниманием к деталям."}</p>
                  </div>

                  <div className="p-4 bg-accent/10 rounded-lg">
                    <h4 className="font-semibold mb-2">💡 Рекомендации</h4>
                    <p className="text-sm">{analysis.recommendations || "Попробуйте предложить работу с контрастными цветами для развития эмоциональной гибкости."}</p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSelectedImage(null);
                    setAnalysis(null);
                  }}
                >
                  Загрузить ещё фото
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
