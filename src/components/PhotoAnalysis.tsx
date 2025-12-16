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

      // Call CLIP AI analysis
      const { data: clipAnalysisData, error: clipError } = await supabase.functions.invoke('analyze-image-clip', {
        body: {
          imageData: selectedImage,
          taskContext: `Анализ рисунка ребенка ${childName} для арт-терапии`
        }
      });

      if (clipError) {
        console.error("CLIP analysis error:", clipError);
        throw clipError;
      }

      const analysisResult = clipAnalysisData?.analysis;

      // Save to database
      const { error: saveError } = await supabase
        .from('artworks')
        .insert({
          user_id: userId,
          image_url: publicUrl,
          storage_path: fileName,
          metadata: {
            source: 'photo_upload',
            clip_analysis: analysisResult,
            analyzed_at: new Date().toISOString(),
            top_labels: analysisResult?.labels?.slice(0, 5) || []
          },
          colors_used: analysisResult?.labels?.filter((l: any) =>
            l.label.includes('color') || l.label === 'colorful'
          ).map((l: any) => l.label) || [],
          emotions_used: analysisResult?.emotions?.map((e: any) => e.emotion) || []
        });

      if (saveError) throw saveError;

      setAnalysis(analysisResult);
      toast.success("Анализ завершён! Результаты сохранены.");
    } catch (error: any) {
      console.error("Ошибка анализа:", error);
      toast.error("Ошибка при анализе фото: " + (error.message || "Неизвестная ошибка"));
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
                <h3 className="text-xl font-bold">Результаты AI-анализа (CLIP)</h3>

                {/* Overall Score */}
                {analysis.overallScore && (
                  <div className="p-4 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg">
                    <h4 className="font-semibold mb-2">📊 Общая оценка</h4>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                          style={{ width: `${analysis.overallScore}%` }}
                        />
                      </div>
                      <span className="font-bold text-lg">{analysis.overallScore}%</span>
                    </div>
                  </div>
                )}

                {/* Top Labels */}
                {analysis.labels && analysis.labels.length > 0 && (
                  <div className="p-4 bg-blue-500/10 rounded-lg">
                    <h4 className="font-semibold mb-3">🏷️ Что видит AI</h4>
                    <div className="flex flex-wrap gap-2">
                      {analysis.labels.slice(0, 8).map((label: any, idx: number) => (
                        <div
                          key={idx}
                          className="px-3 py-1 bg-white/50 rounded-full text-sm flex items-center gap-2"
                        >
                          <span>{label.label}</span>
                          <span className="text-xs text-gray-500">
                            {Math.round(label.score * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emotions */}
                {analysis.emotions && analysis.emotions.length > 0 && (
                  <div className="p-4 bg-pink-500/10 rounded-lg">
                    <h4 className="font-semibold mb-3">❤️ Обнаруженные эмоции</h4>
                    <div className="space-y-2">
                      {analysis.emotions.map((emotion: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="capitalize">{emotion.emotion}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-pink-500 transition-all"
                                style={{ width: `${emotion.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-10">
                              {Math.round(emotion.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">🌈 Анализ цвета</h4>
                    <p className="text-sm">{analysis.colorAnalysis || "Нейтральная цветовая палитра"}</p>
                  </div>

                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <h4 className="font-semibold mb-2">🎨 Композиция</h4>
                    <p className="text-sm">{analysis.compositionInsights || "Сбалансированная композиция"}</p>
                  </div>

                  {analysis.therapeuticRecommendations && analysis.therapeuticRecommendations.length > 0 && (
                    <div className="p-4 bg-green-500/10 rounded-lg">
                      <h4 className="font-semibold mb-2">💡 Рекомендации</h4>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        {analysis.therapeuticRecommendations.map((rec: string, idx: number) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.ceolinaFeedback && (
                    <div className="p-4 bg-yellow-500/10 rounded-lg border-2 border-yellow-500/20">
                      <h4 className="font-semibold mb-2">✨ Сообщение от Ceolina</h4>
                      <p className="text-sm italic">{analysis.ceolinaFeedback}</p>
                    </div>
                  )}
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
