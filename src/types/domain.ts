export type TaskStatus = "open" | "in_progress" | "done" | "skipped" | "blocked";
export type ProductionStatus =
  | "planned" | "prepared" | "in_production" | "editing"
  | "quality_control" | "ready" | "published" | "archived";

export interface Format {
  id: string;
  name: string;
  slug: string;
  description: string;
  default_publish_weekday: number | null;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  current_version_id: string;
  format_id: string;
  formats?: Pick<Format, "name" | "slug">;
  template_versions?: { version_number: number }[];
}

export interface QualityCheck {
  id: string;
  title: string;
  is_completed: boolean;
  position: number;
}

export interface Subtask {
  id: string;
  title: string;
  description: string;
  timecode: string | null;
  status: TaskStatus;
  position: number;
  origin: "template" | "custom";
}

export interface Task {
  id: string;
  title: string;
  description: string;
  hint: string;
  is_required: boolean;
  status: TaskStatus;
  position: number;
  origin: "template" | "custom";
  task_type: string;
  production_subtasks: Subtask[];
  production_quality_checks: QualityCheck[];
}

export interface Section {
  id: string;
  title: string;
  description: string;
  position: number;
  is_collapsed: boolean;
  production_tasks: Task[];
}

export interface Production {
  id: string;
  working_title: string;
  final_title: string;
  production_date: string;
  planned_publish_date: string;
  actual_publish_date: string | null;
  status: ProductionStatus;
  priority: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
  format_id: string;
  template_id: string | null;
  template_version_id: string | null;
  formats?: Pick<Format, "name" | "slug">;
  template_versions?: { version_number: number };
  production_sections?: Section[];
}

export interface LearningSuggestion {
  id: string;
  title: string;
  description: string;
  suggestion_type: string;
  confidence_score: number;
  occurrence_count: number;
  status: "open" | "accepted" | "rejected" | "ignored";
  created_at: string;
  formats?: Pick<Format, "name">;
}
