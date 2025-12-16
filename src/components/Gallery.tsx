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
  Heart,
  Calendar,
  Palette,
  X,
  Grid3x3,
  List
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
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { responsiveText, responsiveGrid, mobileSpacing, touchSizes } from "@/lib/responsive";
import { deleteArtwork as deleteFromStorage } from "@/lib/storage";

interface GalleryProps {
  onBack: () => void;
  childName: string;
}

interface Artwork {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
  emotions_used: any;
  colors_used: any;
  metadata: any;
}

export const Gallery = ({ onBack, childName }: GalleryProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("date");
  const [filterEmotion, setFilterEmotion] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);

  useEffect(() => {
    loadArtworks();
  }, []);

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

      const { data, error } = await supabase
        .from("artworks")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setArtworks(data || []);
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
    if (!artwork.image_url) return;

    try {
      const response = await fetch(artwork.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `artwork_${artwork.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Рисунок скачан!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Ошибка при скачивании");
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
                    {artwork.image_url ? (
                      <img
                        src={artwork.image_url}
                        alt="Artwork"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 flex items-center justify-center">
                        <ImageIcon className="w-16 h-16 text-purple-300 dark:text-purple-700" />
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

      {/* Full Screen Dialog */}
      <Dialog open={!!selectedArtwork} onOpenChange={() => setSelectedArtwork(null)}>
        <DialogContent className="max-w-4xl p-0 bg-black border-0">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/10 hover:bg-white/20 text-white"
              onClick={() => setSelectedArtwork(null)}
            >
              <X size={24} />
            </Button>

            {selectedArtwork?.image_url && (
              <div className="relative">
                <img
                  src={selectedArtwork.image_url}
                  alt="Artwork"
                  className="w-full max-h-[80vh] object-contain"
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={`bg-gradient-to-r ${getEmotionColor(getPrimaryEmotion(selectedArtwork.emotions_used))} border-0`}>
                      {getEmotionEmoji(getPrimaryEmotion(selectedArtwork.emotions_used))}{" "}
                      {getPrimaryEmotion(selectedArtwork.emotions_used)}
                    </Badge>
                    <span className="text-sm">
                      {formatDistanceToNow(new Date(selectedArtwork.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => selectedArtwork && downloadArtwork(selectedArtwork)}
                    >
                      <Download size={16} className="mr-2" />
                      Скачать
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (selectedArtwork) {
                          handleDelete(selectedArtwork.id, selectedArtwork.storage_path);
                          setSelectedArtwork(null);
                        }
                      }}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Удалить
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
