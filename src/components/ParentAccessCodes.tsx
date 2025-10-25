import { useState, useEffect } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Loader2 } from "lucide-react";

interface AccessCode {
  id: string;
  access_code: string;
  child_user_id: string | null;
  created_at: string;
}

export const ParentAccessCodes = () => {
  const [codes, setCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchCodes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("parent_child_links")
        .select("*")
        .eq("parent_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCodes(data || []);
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error("Ошибка загрузки кодов");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, []);

  const generateCode = async () => {
    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Generate code
      const { data: codeData, error: codeError } = await supabase
        .rpc("generate_access_code");

      if (codeError) throw codeError;

      // Insert link
      const { error: insertError } = await supabase
        .from("parent_child_links")
        .insert([{
          parent_user_id: user.id,
          access_code: codeData,
          child_user_id: null,
        }]);

      if (insertError) throw insertError;

      toast.success("Код создан!");
      fetchCodes();
    } catch (error: any) {
      console.error("Error generating code:", error);
      toast.error("Ошибка создания кода");
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Код скопирован!");
  };

  const deleteCode = async (id: string) => {
    try {
      const { error } = await supabase
        .from("parent_child_links")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Код удалён");
      fetchCodes();
    } catch (error) {
      console.error("Error deleting code:", error);
      toast.error("Ошибка удаления кода");
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Коды доступа для детей</h3>
        <Button onClick={generateCode} disabled={generating} size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Создать код
        </Button>
      </div>

      {codes.length === 0 ? (
        <p className="text-center text-muted-foreground py-4">
          Нет созданных кодов. Создайте код для ребёнка.
        </p>
      ) : (
        <div className="space-y-3">
          {codes.map((code) => (
            <Card key={code.id} className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-mono font-bold tracking-wider">
                  {code.access_code}
                </div>
                <div>
                  {code.child_user_id ? (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Используется
                    </span>
                  ) : (
                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                      Ожидает
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyCode(code.access_code)}
                >
                  <Copy className="w-4 h-4" />
                </Button>
                {!code.child_user_id && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => deleteCode(code.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Card>
  );
};
