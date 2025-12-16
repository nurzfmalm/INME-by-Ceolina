/**
 * Компонент для отображения структурированного отчета анализа
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Minus,
  Eye,
  Brain,
  Heart,
  Target,
  Shield,
} from "lucide-react";
import type { AnalysisReport, ProgressComparison } from "@/lib/analysis-types";

interface AnalysisReportProps {
  report: AnalysisReport;
  progressComparison?: ProgressComparison;
}

export const AnalysisReportComponent = ({
  report,
  progressComparison,
}: AnalysisReportProps) => {
  const getConfidenceBadge = (confidence: "low" | "medium" | "high") => {
    const colors = {
      low: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      medium: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      high: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    };

    const labels = {
      low: "Низкая уверенность",
      medium: "Средняя уверенность",
      high: "Высокая уверенность",
    };

    return (
      <Badge className={colors[confidence]}>
        {labels[confidence]}
      </Badge>
    );
  };

  const getTrendIcon = (direction: "positive" | "neutral" | "concerning") => {
    switch (direction) {
      case "positive":
        return <TrendingUp className="text-green-600" size={20} />;
      case "concerning":
        return <TrendingDown className="text-red-600" size={20} />;
      default:
        return <Minus className="text-gray-600" size={20} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Заголовок с метаданными */}
      <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Результаты анализа</h2>
            <p className="text-sm text-muted-foreground">
              Версия {report.analysis_metadata.analysis_version} •{" "}
              {new Date(report.analysis_metadata.analyzed_at).toLocaleString("ru-RU")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground mb-1">Уверенность анализа</p>
            <div className="flex items-center gap-2">
              <Progress
                value={report.analysis_metadata.confidence_score}
                className="w-24 h-2"
              />
              <span className="text-lg font-bold">
                {report.analysis_metadata.confidence_score}%
              </span>
            </div>
          </div>
        </div>

        {report.analysis_metadata.requires_professional_review && (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Рекомендуется профессиональный обзор этого анализа специалистом
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* 1. Визуальное описание */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Eye className="text-purple-600" size={24} />
          <h3 className="text-xl font-bold">1. Описание рисунка</h3>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Объекты на рисунке:</h4>
            <div className="flex flex-wrap gap-2">
              {report.visual_description.objects_identified.map((obj, i) => (
                <Badge key={i} variant="secondary">
                  {obj}
                </Badge>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Расположение элементов:</h4>
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Использование центра:</span>
                <Badge>{report.visual_description.spatial_layout.center_usage}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Распределение в пространстве:</span>
                <Badge>{report.visual_description.spatial_layout.space_distribution}</Badge>
              </div>
            </div>
            <ul className="mt-3 space-y-1">
              {report.visual_description.spatial_layout.object_positions.map((pos, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {pos}</li>
              ))}
            </ul>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-2">Использованные цвета:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {report.visual_description.colors_used.map((colorData, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted rounded">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: colorData.hex }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{colorData.color}</p>
                    <p className="text-xs text-muted-foreground">
                      {colorData.coverage_percentage}% • {colorData.location}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {report.visual_description.patterns_detected.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2">Повторяющиеся паттерны:</h4>
                <ul className="space-y-1">
                  {report.visual_description.patterns_detected.map((pattern, i) => (
                    <li key={i} className="text-sm">• {pattern}</li>
                  ))}
                </ul>
              </div>
            </>
          )}

          <Separator />

          <div className="flex justify-between items-center bg-muted p-3 rounded">
            <span className="font-semibold">Уровень детализации:</span>
            <Badge variant="outline" className="text-base">
              {report.visual_description.detail_level}
            </Badge>
          </div>
        </div>
      </Card>

      {/* 2. Анализ процесса */}
      <Card className="p-6 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold">2. Анализ процесса рисования</h3>
        </div>

        <div className="space-y-3">
          <div>
            <h4 className="font-semibold text-sm mb-1">Влияние эмоционального состояния:</h4>
            <p className="text-sm">{report.process_analysis.emotional_state_impact}</p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-1">Паттерны нажима:</h4>
            <p className="text-sm">{report.process_analysis.pressure_patterns}</p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-1">Временные наблюдения:</h4>
            <p className="text-sm">{report.process_analysis.timing_observations}</p>
          </div>
          <Separator />
          <div>
            <h4 className="font-semibold text-sm mb-1">Поведенческие корреляции:</h4>
            <p className="text-sm">{report.process_analysis.behavioral_correlations}</p>
          </div>
        </div>
      </Card>

      {/* 3. Интерпретация */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Heart className="text-pink-600" size={24} />
          <h3 className="text-xl font-bold">3. Интерпретация (гипотезы)</h3>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-3">Эмоциональные темы:</h4>
            {report.interpretation.emotional_themes.map((theme, i) => (
              <Card key={i} className="p-4 mb-3 bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950 dark:to-purple-950">
                <div className="flex items-start justify-between mb-2">
                  <h5 className="font-semibold">{theme.theme}</h5>
                  {getConfidenceBadge(theme.confidence)}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Обоснование:</p>
                  <ul className="space-y-1">
                    {theme.supporting_evidence.map((evidence, j) => (
                      <li key={j} className="text-sm flex items-start gap-2">
                        <CheckCircle size={16} className="mt-0.5 text-green-600 flex-shrink-0" />
                        <span>{evidence}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>

          {report.interpretation.asd_specific_markers.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Специфические маркеры ASD:</h4>
                {report.interpretation.asd_specific_markers.map((marker, i) => (
                  <Card key={i} className="p-4 mb-3 bg-yellow-50 dark:bg-yellow-950/20">
                    <h5 className="font-semibold mb-1">{marker.marker}</h5>
                    <p className="text-sm mb-2">{marker.observation}</p>
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        <strong>Клиническая значимость:</strong> {marker.clinical_relevance}
                      </AlertDescription>
                    </Alert>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {/* 4. Динамика (если есть) */}
      {(report.progress_tracking || progressComparison) && (
        <Card className="p-6 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-600" size={24} />
            <h3 className="text-xl font-bold">4. Динамика прогресса</h3>
          </div>

          {report.progress_tracking && (
            <div className="space-y-3 mb-4">
              <h4 className="font-semibold">Изменения относительно предыдущих рисунков:</h4>
              {report.progress_tracking.changes_from_previous.map((change, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-white dark:bg-slate-900 rounded">
                  {getTrendIcon(change.direction)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{change.aspect}</p>
                    <p className="text-sm text-muted-foreground">{change.change_description}</p>
                  </div>
                </div>
              ))}
              <Separator />
              <div className="bg-muted p-4 rounded">
                <h5 className="font-semibold mb-2">Анализ тренда:</h5>
                <p className="text-sm">{report.progress_tracking.trend_analysis}</p>
              </div>
            </div>
          )}

          {progressComparison && (
            <div className="space-y-3">
              <Alert className={progressComparison.therapist_attention_required ? "bg-orange-50" : ""}>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Общая траектория:</strong> {progressComparison.overall_trajectory}
                  {progressComparison.therapist_attention_required && (
                    <span className="block mt-1 text-orange-700">
                      Рекомендуется консультация специалиста
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </Card>
      )}

      {/* 5. Рекомендации */}
      <Card className="p-6 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950 dark:to-blue-950">
        <div className="flex items-center gap-2 mb-4">
          <Target className="text-indigo-600" size={24} />
          <h3 className="text-xl font-bold">5. Рекомендации</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold mb-2">Для родителей:</h4>
            <ul className="space-y-2">
              {report.recommendations.for_parents.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-green-600 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Для терапевтов:</h4>
            <ul className="space-y-2">
              {report.recommendations.for_therapists.map((rec, i) => (
                <li key={i} className="text-sm flex items-start gap-2">
                  <CheckCircle size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="font-semibold mb-2">Рекомендуемые активности:</h4>
          <div className="flex flex-wrap gap-2">
            {report.recommendations.suggested_activities.map((activity, i) => (
              <Badge key={i} variant="secondary" className="px-3 py-1">
                {activity}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="font-semibold mb-2">Области для мониторинга:</h4>
          <ul className="space-y-1">
            {report.recommendations.areas_to_monitor.map((area, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <AlertTriangle size={16} className="mt-0.5 text-orange-600 flex-shrink-0" />
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>

      {/* Дисклеймер */}
      <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-sm">
          <strong>Важно:</strong> {report.disclaimer}
        </AlertDescription>
      </Alert>
    </div>
  );
};
