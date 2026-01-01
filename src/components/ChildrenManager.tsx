import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
  Edit2,
  User,
  Heart,
  TrendingUp,
  Check,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

interface ChildrenManagerProps {
  onBack: () => void;
  onSelectChild: (childId: string, childName: string) => void;
  selectedChildId?: string | null;
}

interface Child {
  id: string;
  name: string;
  age: number | null;
  avatar_url: string | null;
  emotional_state: string | null;
  development_notes: string | null;
  created_at: string;
  updated_at: string;
}

const EMOTIONAL_STATES = [
  { value: "excellent", label: "Отличное", color: "bg-green-500", emoji: "😊" },
  { value: "good", label: "Хорошее", color: "bg-blue-500", emoji: "🙂" },
  { value: "neutral", label: "Нейтральное", color: "bg-gray-500", emoji: "😐" },
  { value: "concerned", label: "Требует внимания", color: "bg-yellow-500", emoji: "😟" },
  { value: "needs_support", label: "Нужна поддержка", color: "bg-red-500", emoji: "😢" },
];

export const ChildrenManager = ({
  onBack,
  onSelectChild,
  selectedChildId,
}: ChildrenManagerProps) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [formData, setFormData] = useState({ name: "", age: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("children")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error("Error loading children:", error);
      toast.error("Ошибка загрузки профилей");
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!formData.name.trim()) {
      toast.error("Введите имя ребёнка");
      return;
    }

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("children")
        .insert({
          user_id: user.id,
          name: formData.name.trim(),
          age: formData.age ? parseInt(formData.age) : null,
        })
        .select()
        .single();

      if (error) throw error;

      setChildren([...children, data]);
      setShowAddDialog(false);
      setFormData({ name: "", age: "" });
      toast.success("Профиль ребёнка создан!");
    } catch (error: any) {
      console.error("Error adding child:", error);
      toast.error("Ошибка создания профиля");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateChild = async () => {
    if (!editingChild || !formData.name.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("children")
        .update({
          name: formData.name.trim(),
          age: formData.age ? parseInt(formData.age) : null,
        })
        .eq("id", editingChild.id);

      if (error) throw error;

      setChildren(
        children.map((c) =>
          c.id === editingChild.id
            ? { ...c, name: formData.name.trim(), age: formData.age ? parseInt(formData.age) : null }
            : c
        )
      );
      setEditingChild(null);
      setFormData({ name: "", age: "" });
      toast.success("Профиль обновлён!");
    } catch (error) {
      console.error("Error updating child:", error);
      toast.error("Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm("Удалить профиль ребёнка? Все данные будут потеряны.")) return;

    try {
      const { error } = await supabase.from("children").delete().eq("id", childId);

      if (error) throw error;

      setChildren(children.filter((c) => c.id !== childId));
      toast.success("Профиль удалён");
    } catch (error) {
      console.error("Error deleting child:", error);
      toast.error("Ошибка удаления");
    }
  };

  const getEmotionalState = (state: string | null) => {
    return EMOTIONAL_STATES.find((s) => s.value === state) || EMOTIONAL_STATES[2];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Профили детей</h1>
              <p className="text-sm text-muted-foreground">
                Управление профилями и прогрессом
              </p>
            </div>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>

        {/* Children List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : children.length === 0 ? (
          <Card className="p-12 text-center">
            <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Нет профилей</h3>
            <p className="text-muted-foreground mb-4">
              Добавьте первый профиль ребёнка для начала работы
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Добавить ребёнка
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {children.map((child) => {
              const emotionalState = getEmotionalState(child.emotional_state);
              const isSelected = selectedChildId === child.id;

              return (
                <Card
                  key={child.id}
                  className={`p-6 cursor-pointer transition-all hover:shadow-lg ${
                    isSelected ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => onSelectChild(child.id, child.name)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-white text-xl font-bold">
                        {child.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {child.name}
                          {isSelected && (
                            <Check className="w-4 h-4 text-green-500" />
                          )}
                        </h3>
                        {child.age && (
                          <p className="text-sm text-muted-foreground">
                            {child.age} лет
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChild(child);
                          setFormData({
                            name: child.name,
                            age: child.age?.toString() || "",
                          });
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChild(child.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Status Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Heart className="w-4 h-4" />
                        Состояние
                      </div>
                      <Badge className={`${emotionalState.color} text-white`}>
                        {emotionalState.emoji} {emotionalState.label}
                      </Badge>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Активность
                      </div>
                      <p className="text-sm font-medium">
                        {formatDistanceToNow(new Date(child.updated_at), {
                          addSuffix: true,
                          locale: ru,
                        })}
                      </p>
                    </div>
                  </div>

                  {child.development_notes && (
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {child.development_notes}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Add Dialog */}
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Добавить ребёнка</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="childName">Имя</Label>
                <Input
                  id="childName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Имя ребёнка"
                />
              </div>
              <div>
                <Label htmlFor="childAge">Возраст</Label>
                <Input
                  id="childAge"
                  type="number"
                  min="3"
                  max="18"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Возраст"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Отмена
                </Button>
                <Button onClick={handleAddChild} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Добавить"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editingChild} onOpenChange={() => setEditingChild(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Редактировать профиль</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editName">Имя</Label>
                <Input
                  id="editName"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Имя ребёнка"
                />
              </div>
              <div>
                <Label htmlFor="editAge">Возраст</Label>
                <Input
                  id="editAge"
                  type="number"
                  min="3"
                  max="18"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  placeholder="Возраст"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingChild(null)}>
                  Отмена
                </Button>
                <Button onClick={handleUpdateChild} disabled={saving}>
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Сохранить"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};
