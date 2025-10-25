import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";

interface GalleryProps {
  onBack: () => void;
  childName: string;
}

export const Gallery = ({ onBack, childName }: GalleryProps) => {
  // Placeholder artwork data - will be replaced with Supabase data
  const artworks = [
    { id: 1, imageUrl: "/placeholder.svg", title: "Радость", date: "Сегодня" },
    { id: 2, imageUrl: "/placeholder.svg", title: "Спокойствие", date: "Вчера" },
    { id: 3, imageUrl: "/placeholder.svg", title: "Энергия", date: "2 дня назад" },
  ];

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
        {artworks.length === 0 ? (
          <Card className="p-12 text-center border-0 bg-card">
            <ImageIcon className="mx-auto mb-4 text-muted-foreground" size={64} />
            <h2 className="text-xl font-semibold mb-2">Пока пусто</h2>
            <p className="text-muted-foreground mb-6">
              Создай свой первый рисунок в разделе АРТ-Терапия
            </p>
            <Button onClick={onBack}>Вернуться назад</Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {artworks.map((artwork) => (
              <Card
                key={artwork.id}
                className="overflow-hidden border-0 bg-card hover:shadow-float transition-all cursor-pointer"
              >
                <div className="aspect-square bg-muted flex items-center justify-center">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold mb-1">{artwork.title}</h3>
                  <p className="text-sm text-muted-foreground">{artwork.date}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
