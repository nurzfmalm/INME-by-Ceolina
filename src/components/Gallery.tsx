import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon, Trash2, Filter } from "lucide-react";
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
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface GalleryProps {
  onBack: () => void;
  childName: string;
}

interface Artwork {
  id: string;
  image_url: string | null;
  storage_path: string | null;
  created_at: string;
  emotions_used: any; // Json type from database
  colors_used: any; // Json type from database
  metadata: any; // Json type from database
}

export const Gallery = ({ onBack, childName }: GalleryProps) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<string>("date");
  const [filterEmotion, setFilterEmotion] = useState<string>("all");

  useEffect(() => {
    loadArtworks();
  }, []);

  const loadArtworks = async () => {
    try {
      const isAuth = await isUserAuthenticated();
      
      if (!isAuth) {
        // Demo mode: load from localStorage
        const stored = localStorage.getItem('ceolinaArtworks');
        if (stored) {
          setArtworks(JSON.parse(stored));
        }
        setLoading(false);
        return;
      }

      // Authenticated mode: load from Supabase
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

  const deleteArtwork = async (id: string, storagePath: string) => {
    try {
      const isAuth = await isUserAuthenticated();
      
      if (!isAuth) {
        // Demo mode: delete from localStorage
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

      // Authenticated mode: delete from Supabase
      const { error: storageError } = await supabase.storage
        .from("artworks")
        .remove([storagePath]);

      if (storageError) throw storageError;

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

  const getPrimaryEmotion = (emotions: Record<string, number>) => {
    if (!emotions || Object.keys(emotions).length === 0) return "другое";
    return Object.keys(emotions).sort((a, b) => emotions[b] - emotions[a])[0];
  };

  const getColorTone = (colors: string[]) => {
    if (!colors || colors.length === 0) return "neutral";
    // Simple warm/cool detection based on color values
    const warmColors = ["#FFD93D", "#FF6B6B", "#FFB4D6"];
    const coolColors = ["#6BCB77", "#4D96FF", "#C68FE6"];
    const warmCount = colors.filter((c) => warmColors.includes(c)).length;
    const coolCount = colors.filter((c) => coolColors.includes(c)).length;
    return warmCount > coolCount ? "warm" : coolCount > warmCount ? "cool" : "neutral";
  };

  // Filter and sort artworks
  const processedArtworks = artworks
    .filter((art) => {
      if (filterEmotion === "all") return true;
      return getPrimaryEmotion(art.emotions_used) === filterEmotion;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "date":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "emotion":
          return getPrimaryEmotion(a.emotions_used).localeCompare(
            getPrimaryEmotion(b.emotions_used)
          );
        case "tone":
          return getColorTone(a.colors_used).localeCompare(getColorTone(b.colors_used));
        default:
          return 0;
      }
    });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card shadow-soft border-b border-border sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft size={24} />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-warm rounded-full flex items-center justify-center">
                <ImageIcon className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-xl font-bold">Твоя галерея</h1>
                <p className="text-sm text-muted-foreground">Все твои творения, {childName}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Filters */}
        {artworks.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Сортировка" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">По дате</SelectItem>
                  <SelectItem value="emotion">По эмоции</SelectItem>
                  <SelectItem value="tone">По тону</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select value={filterEmotion} onValueChange={setFilterEmotion}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Эмоция" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все эмоции</SelectItem>
                <SelectItem value="joy">Радость</SelectItem>
                <SelectItem value="calm">Спокойствие</SelectItem>
                <SelectItem value="sadness">Грусть</SelectItem>
                <SelectItem value="energy">Энергия</SelectItem>
                <SelectItem value="creative">Творчество</SelectItem>
                <SelectItem value="gentle">Нежность</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {loading ? (
          <Card className="p-12 text-center border-0 bg-card">
            <p className="text-muted-foreground">Загрузка...</p>
          </Card>
        ) : processedArtworks.length === 0 ? (
          <Card className="p-12 text-center border-0 bg-card">
            <ImageIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <h2 className="text-xl font-semibold mb-2">
              {artworks.length === 0 ? "Пока пусто" : "Нет рисунков с такими параметрами"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {artworks.length === 0
                ? "Создай свой первый рисунок в разделе АРТ-Терапия"
                : "Попробуй изменить фильтры"}
            </p>
            <Button onClick={onBack}>Вернуться назад</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {processedArtworks.map((artwork) => (
              <Card
                key={artwork.id}
                className="group overflow-hidden border-0 bg-card hover:shadow-float transition-all"
              >
                <div className="relative aspect-square bg-muted">
                  <img
                    src={artwork.image_url}
                    alt="Artwork"
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => deleteArtwork(artwork.id, artwork.storage_path)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {artwork.colors_used?.slice(0, 3).map((color, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {getPrimaryEmotion(artwork.emotions_used)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(artwork.created_at), {
                      addSuffix: true,
                      locale: ru,
                    })}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
