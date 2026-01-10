import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Image as ImageIcon,
  Trash2,
  Filter,
  Download,
  Maximize2,
  X,
  Grid3x3,
  List,
  FileText,
  ChevronLeft,
  ChevronRight,
  Brain
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getCurrentUserId, isUserAuthenticated } from "@/lib/auth-helpers";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatDistanceToNow, format } from "date-fns";
import { ru } from "date-fns/locale";
import { responsiveText, mobileSpacing, touchSizes } from "@/lib/responsive";
import { deleteArtwork as deleteFromStorage, getArtworkUrl } from "@/lib/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles } from "lucide-react";

interface GalleryProps {
  onBack: () => void;
  childName: string;
  childId?: string | null;
}

interface Artwork {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
  emotions_used: any;
  colors_used: any;
  metadata: any;
  signed_url?: string; // Runtime signed URL for display
}

export const Gallery = ({ onBack, childName, childId }: GalleryProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("date");
  const [filterEmotion, setFilterEmotion] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  useEffect(() => {
    loadArtworks();
  }, [childId]);

  const loadArtworks = async () => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem('ceolinaArtworks');
        if (stored) {
          setArtworks(JSON.parse(stored));
        }
        setLoading(false);
        return;
      }

      const userId = await getCurrentUserId();
      if (!userId) return;

      let query = supabase
        .from("artworks")
        .select("*")
        .eq("user_id", userId);
      
      // Filter by child_id if provided
      if (childId) {
        query = query.eq("child_id", childId);
      }
      
      const { data, error } = await query.order("created_at", { ascending: false });

      if (error) throw error;
      
      // Generate signed URLs for all artworks with storage_path
      const artworksWithUrls = await Promise.all(
        (data || []).map(async (artwork) => {
          if (artwork.storage_path) {
            const signedUrl = await getArtworkUrl(artwork.storage_path, 3600);
            return { ...artwork, signed_url: signedUrl };
          }
          return artwork;
        })
      );
      
      setArtworks(artworksWithUrls);
    } catch (error) {
      console.error("Error loading artworks:", error);
      toast.error("Ошибка при загрузке галереи");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, storagePath: string | null) => {
    try {
      const isAuth = await isUserAuthenticated();

      if (!isAuth) {
        const stored = localStorage.getItem('ceolinaArtworks');
        if (stored) {
          const artworks = JSON.parse(stored);
          const updated = artworks.filter((art: Artwork) => art.id !== id);
          localStorage.setItem('ceolinaArtworks', JSON.stringify(updated));
          setArtworks(updated);
          toast.success("Рисунок удалён");
        }
        return;
      }

      if (storagePath) {
        await deleteFromStorage(storagePath);
      }

      const { error: dbError } = await supabase
        .from("artworks")
        .delete()
        .eq("id", id);

      if (dbError) throw dbError;

      setArtworks((prev) => prev.filter((art) => art.id !== id));
      toast.success("Рисунок удалён");
    } catch (error) {
      console.error("Error deleting artwork:", error);
      toast.error("Ошибка при удалении");
    }
  };

  const downloadArtwork = async (artwork: Artwork) => {
    const url = artwork.signed_url || artwork.image_url;
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `artwork_${artwork.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
      toast.success("Рисунок скачан!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Ошибка при скачивании");
    }
  };

  const analyzeArtwork = async (artwork: Artwork) => {
    const imageUrl = artwork.signed_url || artwork.image_url;
    if (!imageUrl) {
      toast.error("Нет изображения для анализа");
      return;
    }

    setAnalyzingId(artwork.id);
    
    try {
      const { data, error } = await supabase.functions.invoke('analyze-drawing-deep', {
        body: { 
          imageUrl,
          childAge: 7, // Default age if not available
          previousAnalyses: []
        }
      });

      if (error) throw error;

      // Update artwork with analysis in database
      const updatedMetadata = {
        ...artwork.metadata,
        deep_analysis: data.analysis
      };

      const { error: updateError } = await supabase
        .from('artworks')
        .update({ metadata: updatedMetadata })
        .eq('id', artwork.id);

      if (updateError) throw updateError;

      // Update local state
      const updatedArtwork = { ...artwork, metadata: updatedMetadata };
      setArtworks(prev => prev.map(a => a.id === artwork.id ? updatedArtwork : a));
      
      if (selectedArtwork?.id === artwork.id) {
        setSelectedArtwork(updatedArtwork);
      }

      toast.success("Анализ рисунка завершён!");
    } catch (error) {
      console.error("Analysis error:", error);
      toast.error("Ошибка при анализе рисунка");
    } finally {
      setAnalyzingId(null);
    }
  };

  const getPrimaryEmotion = (emotions: Record<string, number>) => {
    if (!emotions || Object.keys(emotions).length === 0) return "другое";
    return Object.keys(emotions).sort((a, b) => emotions[b] - emotions[a])[0];
  };

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      радость: "from-yellow-400 to-orange-500",
      спокойствие: "from-blue-400 to-cyan-500",
      грусть: "from-blue-500 to-indigo-600",
      удивление: "from-purple-400 to-pink-500",
      другое: "from-gray-400 to-slate-500",
    };
    return colors[emotion] || colors.другое;
  };

  const getEmotionEmoji = (emotion: string) => {
    const emojis: Record<string, string> = {
      радость: "😊",
      спокойствие: "😌",
      грусть: "😢",
      удивление: "😲",
      другое: "🎨",
    };
    return emojis[emotion] || emojis.другое;
  };

  const processedArtworks = artworks
    .filter((art) => {
      if (filterEmotion === "all") return true;
      return getPrimaryEmotion(art.emotions_used) === filterEmotion;
    })
    .sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return 0;
    });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-pink-50 dark:from-slate-950 dark:via-purple-950/30 dark:to-pink-950">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-lg bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className={`${mobileSpacing.screenPadding} py-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className={touchSizes.icon}
              >
                <ArrowLeft size={20} />
              </Button>
              <div>
                <h1 className={responsiveText.h3}>Твоя Галерея</h1>
                <p className="text-xs sm:text-sm text-slate-500">{artworks.length} рисунков</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="hidden sm:flex"
              >
                {viewMode === "grid" ? <List size={20} /> : <Grid3x3 size={20} />}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">По дате</SelectItem>
                <SelectItem value="emotion">По эмоции</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEmotion} onValueChange={setFilterEmotion}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все эмоции</SelectItem>
                <SelectItem value="радость">😊 Радость</SelectItem>
                <SelectItem value="спокойствие">😌 Спокойствие</SelectItem>
                <SelectItem value="грусть">😢 Грусть</SelectItem>
                <SelectItem value="удивление">😲 Удивление</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`${mobileSpacing.screenPadding} py-6`}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : processedArtworks.length === 0 ? (
          <Card className="p-12 text-center border-0 bg-white/80 dark:bg-slate-900/80">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-slate-400" />
            <h3 className={`${responsiveText.h3} mb-2 text-slate-700 dark:text-slate-300`}>
              Галерея пуста
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              Создай свой первый рисунок и он появится здесь!
            </p>
          </Card>
        ) : (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                : "space-y-4"
            }
          >
            {processedArtworks.map((artwork) => {
              const emotion = getPrimaryEmotion(artwork.emotions_used);
              const emotionColor = getEmotionColor(emotion);
              const emoji = getEmotionEmoji(emotion);

              return (
                <Card
                  key={artwork.id}
                  className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  {/* Image */}
                  <div
                    className="relative aspect-square overflow-hidden cursor-pointer"
                    onClick={() => setSelectedArtwork(artwork)}
                  >
                    {(artwork.signed_url || artwork.image_url) ? (
                      <img
                        src={artwork.signed_url || artwork.image_url || ''}
                        alt="Artwork"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          console.error('Image load error for artwork:', artwork.id);
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-purple-300 dark:text-purple-700" />
                      </div>
                    )}

                    {/* Analysis badge */}
                    {artwork.metadata?.deep_analysis && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 text-xs">
                          <Sparkles size={12} className="mr-1" />
                          Анализ
                        </Badge>
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedArtwork(artwork);
                        }}
                      >
                        <Maximize2 size={20} />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          analyzeArtwork(artwork);
                        }}
                        disabled={analyzingId === artwork.id}
                        title="Анализировать рисунок"
                      >
                        {analyzingId === artwork.id ? (
                          <Loader2 size={20} className="animate-spin" />
                        ) : (
                          <Brain size={20} />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadArtwork(artwork);
                        }}
                      >
                        <Download size={20} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(artwork.id, artwork.storage_path);
                        }}
                      >
                        <Trash2 size={20} />
                      </Button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className={`bg-gradient-to-r ${emotionColor} text-white border-0`}>
                        <span className="mr-1">{emoji}</span>
                        {emotion}
                      </Badge>
                      <span className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(artwork.created_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </span>
                    </div>

                    {artwork.colors_used && Array.isArray(artwork.colors_used) && (
                      <div className="flex gap-1">
                        {artwork.colors_used.slice(0, 5).map((color: string, i: number) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-white dark:border-slate-800 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {/* Full Screen Preview Dialog */}
      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] p-0 bg-background border-0 overflow-hidden">
          {selectedArtwork && (
            <div className="flex flex-col lg:flex-row h-full max-h-[95vh]">
              {/* Image Section */}
              <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] lg:min-h-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
                  onClick={() => setSelectedArtwork(null)}
                >
                  <X size={24} />
                </Button>

                {/* Navigation */}
                {processedArtworks.length > 1 && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => {
                        const currentIndex = processedArtworks.findIndex(a => a.id === selectedArtwork.id);
                        const prevIndex = (currentIndex - 1 + processedArtworks.length) % processedArtworks.length;
                        setSelectedArtwork(processedArtworks[prevIndex]);
                      }}
                    >
                      <ChevronLeft size={24} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white"
                      onClick={() => {
                        const currentIndex = processedArtworks.findIndex(a => a.id === selectedArtwork.id);
                        const nextIndex = (currentIndex + 1) % processedArtworks.length;
                        setSelectedArtwork(processedArtworks[nextIndex]);
                      }}
                    >
                      <ChevronRight size={24} />
                    </Button>
                  </>
                )}

                {(selectedArtwork.signed_url || selectedArtwork.image_url) ? (
                  <img
                    src={selectedArtwork.signed_url || selectedArtwork.image_url || ''}
                    alt="Artwork"
                    className="max-w-full max-h-[50vh] lg:max-h-[90vh] object-contain"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center">
                    <ImageIcon className="w-16 h-16 text-slate-600" />
                  </div>
                )}
              </div>

              {/* Details Section */}
              <div className="w-full lg:w-96 bg-background border-l border-border flex flex-col max-h-[45vh] lg:max-h-[95vh]">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={`bg-gradient-to-r ${getEmotionColor(getPrimaryEmotion(selectedArtwork.emotions_used))} text-white border-0`}>
                      {getEmotionEmoji(getPrimaryEmotion(selectedArtwork.emotions_used))}{" "}
                      {getPrimaryEmotion(selectedArtwork.emotions_used)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(selectedArtwork.created_at), "d MMMM yyyy, HH:mm", { locale: ru })}
                    </span>
                  </div>
                  
                  {/* Colors */}
                  {selectedArtwork.colors_used && Array.isArray(selectedArtwork.colors_used) && selectedArtwork.colors_used.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {selectedArtwork.colors_used.map((color: string, i: number) => (
                        <div
                          key={i}
                          className="w-6 h-6 rounded-full border-2 border-background shadow-sm"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1 p-4">
                  <Tabs defaultValue="analysis" className="w-full">
                    <TabsList className="w-full mb-4">
                      <TabsTrigger value="analysis" className="flex-1">
                        <Brain className="w-4 h-4 mr-2" />
                        Анализ
                      </TabsTrigger>
                      <TabsTrigger value="info" className="flex-1">
                        <FileText className="w-4 h-4 mr-2" />
                        Инфо
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="analysis" className="space-y-4">
                      {selectedArtwork.metadata?.deep_analysis ? (
                        <div className="space-y-4 text-sm">
                          {/* Visual Description */}
                          {selectedArtwork.metadata.deep_analysis.visual_description && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-primary">Визуальное описание</h4>
                              <p className="text-muted-foreground">
                                {selectedArtwork.metadata.deep_analysis.visual_description.overall_description}
                              </p>
                              {selectedArtwork.metadata.deep_analysis.visual_description.elements_identified?.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {selectedArtwork.metadata.deep_analysis.visual_description.elements_identified.map((el: any, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-xs">
                                      {el.element || el}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Interpretation */}
                          {selectedArtwork.metadata.deep_analysis.interpretation && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-primary">Интерпретация</h4>
                              {selectedArtwork.metadata.deep_analysis.interpretation.emotional_themes?.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">Эмоциональные темы:</p>
                                  <div className="space-y-1">
                                    {selectedArtwork.metadata.deep_analysis.interpretation.emotional_themes.map((theme: any, i: number) => (
                                      <div key={i} className="text-muted-foreground">
                                        • <span className="font-medium">{theme.theme}</span>: {theme.explanation}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Recommendations */}
                          {selectedArtwork.metadata.deep_analysis.recommendations && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-primary">Рекомендации</h4>
                              {selectedArtwork.metadata.deep_analysis.recommendations.therapeutic_strategies?.length > 0 && (
                                <ul className="text-muted-foreground space-y-1">
                                  {selectedArtwork.metadata.deep_analysis.recommendations.therapeutic_strategies.slice(0, 3).map((rec: string, i: number) => (
                                    <li key={i}>• {rec}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {/* Progress */}
                          {selectedArtwork.metadata.deep_analysis.progress && (
                            <div className="space-y-2">
                              <h4 className="font-semibold text-primary">Прогресс</h4>
                              <p className="text-muted-foreground">
                                {selectedArtwork.metadata.deep_analysis.progress.comparison_summary}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Brain className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>Нет данных анализа</p>
                          <p className="text-xs mt-1">Загрузите рисунок через "Глубокий анализ" для получения AI-анализа</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="info" className="space-y-4">
                      <div className="space-y-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Создано:</span>
                          <p className="font-medium">
                            {format(new Date(selectedArtwork.created_at), "d MMMM yyyy 'в' HH:mm", { locale: ru })}
                          </p>
                        </div>

                        {selectedArtwork.metadata?.source && (
                          <div>
                            <span className="text-muted-foreground">Источник:</span>
                            <p className="font-medium">
                              {selectedArtwork.metadata.source === 'photo_upload' ? 'Загружено фото' : 
                               selectedArtwork.metadata.source === 'solo_drawing' ? 'Свободное рисование' :
                               selectedArtwork.metadata.source === 'guided_drawing' ? 'Рисование по трафарету' :
                               selectedArtwork.metadata.source === 'task' ? 'Задание' :
                               selectedArtwork.metadata.source}
                            </p>
                          </div>
                        )}

                        {selectedArtwork.metadata?.observation_data && (
                          <div>
                            <span className="text-muted-foreground">Наблюдения при создании:</span>
                            <div className="mt-1 space-y-1">
                              {selectedArtwork.metadata.observation_data.task_type && (
                                <p>Тип: {selectedArtwork.metadata.observation_data.task_type}</p>
                              )}
                              {selectedArtwork.metadata.observation_data.emotional_states?.length > 0 && (
                                <p>Эмоции: {selectedArtwork.metadata.observation_data.emotional_states.join(', ')}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {selectedArtwork.emotions_used && Object.keys(selectedArtwork.emotions_used).length > 0 && (
                          <div>
                            <span className="text-muted-foreground">Эмоции:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(selectedArtwork.emotions_used).map(([emotion, count]) => (
                                <Badge key={emotion} variant="outline" className="text-xs">
                                  {emotion}: {String(count)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </ScrollArea>

                {/* Actions */}
                <div className="p-4 border-t flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    onClick={() => analyzeArtwork(selectedArtwork)}
                    disabled={analyzingId === selectedArtwork.id}
                  >
                    {analyzingId === selectedArtwork.id ? (
                      <Loader2 size={16} className="mr-2 animate-spin" />
                    ) : (
                      <Brain size={16} className="mr-2" />
                    )}
                    {analyzingId === selectedArtwork.id ? 'Анализ...' : 'Анализировать'}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => downloadArtwork(selectedArtwork)}
                  >
                    <Download size={16} />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      handleDelete(selectedArtwork.id, selectedArtwork.storage_path);
                      setSelectedArtwork(null);
                    }}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
