import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Copy, Plus, Trash2, Loader2, Info, CheckCircle2, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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
    <div className="space-y-6">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Как работает привязка ребёнка</AlertTitle>
        <AlertDescription>
          <ol className="list-decimal list-inside space-y-2 mt-2 text-sm">
            <li>Создайте код доступа нажав кнопку "Создать код"</li>
            <li>Передайте код ребёнку (покажите на экране или запишите)</li>
            <li>Ребёнок при входе в приложение выбирает роль "Я Ребёнок"</li>
            <li>Ребёнок вводит полученный код и создаёт свой профиль</li>
            <li>После этого вы увидите, что код используется, и получите доступ к его аналитике</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Коды доступа</CardTitle>
              <CardDescription>Создавайте коды для привязки детских профилей</CardDescription>
            </div>
            <Button onClick={generateCode} disabled={generating}>
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Создание...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Создать код
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {codes.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-2">Нет созданных кодов</p>
              <p className="text-sm text-muted-foreground">
                Создайте первый код для привязки профиля ребёнка
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {codes.map((code) => (
                <Card key={code.id} className="p-4 border-2">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0">
                        {code.child_user_id ? (
                          <CheckCircle2 className="w-8 h-8 text-green-600" />
                        ) : (
                          <Clock className="w-8 h-8 text-yellow-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-3xl font-mono font-bold tracking-widest mb-1">
                          {code.access_code}
                        </div>
                        <div className="flex items-center gap-2">
                          {code.child_user_id ? (
                            <span className="text-xs font-medium text-green-600 bg-green-50 px-3 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Привязан к ребёнку
                            </span>
                          ) : (
                            <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Ожидает использования
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Создан: {new Date(code.created_at).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => copyCode(code.access_code)}
                        className="flex-1 md:flex-none"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Копировать
                      </Button>
                      {!code.child_user_id && (
                        <Button
                          variant="outline"
                          onClick={() => deleteCode(code.id)}
                          className="flex-1 md:flex-none"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
