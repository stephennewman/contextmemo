export interface QuizQuestion {
  id: string
  question: string
  options: { key: string; text: string }[]
  correctAnswer: string
  explanation: string
  category: string
}

export interface CourseModule {
  slug: string
  title: string
  description: string
  order: number
  estimatedMinutes: number
  sections: ModuleSection[]
}

export interface ModuleSection {
  title: string
  content: string // markdown
}

export interface Enrollment {
  id: string
  email: string
  name: string | null
  enrolled_at: string
  baseline_completed: boolean
  baseline_score: number | null
  course_completed: boolean
  final_completed: boolean
  final_score: number | null
}

export interface Assessment {
  id: string
  enrollment_id: string
  assessment_type: 'baseline' | 'final'
  score: number | null
  total_questions: number
  started_at: string
  completed_at: string | null
}

export interface AssessmentAnswer {
  id: string
  assessment_id: string
  question_id: string
  selected_answer: string | null
  is_correct: boolean
  time_spent_ms: number
  answered_at: string
}

export interface ModuleProgress {
  id: string
  enrollment_id: string
  module_slug: string
  completed: boolean
  completed_at: string | null
}
