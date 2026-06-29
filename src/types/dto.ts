import type {
  AffiliationRole, Role, ExamStep, LayoutMode,
  ProblemType, ProgrammingLanguage, RubricSource,
  SheetStatus, RegionShape, OCRStatus,
  GradeStatus, GradeMethod, JobType, JobStatus,
} from './enums'

// ── 공통 ─────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T | null
  meta: PageMeta | CursorMeta | null
  error: ApiError | null
}

export interface ApiError {
  code: string
  message: string
  field?: string
}

export interface PageMeta {
  page: number
  size: number
  total: number
}

export interface CursorMeta {
  next_cursor: string | null
  has_more: boolean
}

export interface Region {
  page: number
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  page: number
  x: number
  y: number
}

export interface PresignedUrlResponse {
  upload_url: string
  file_key: string
}

// answer-sheet 전용 — server가 생성한 answer_sheet_id를 함께 반환
export interface AnswerSheetPresignedUrlResponse extends PresignedUrlResponse {
  answer_sheet_id: number
}

export interface UploadCompleteResponse {
  answer_sheet_id: number
  job_id: number | null
}

// ── 인증 / 회원 ───────────────────────────────────────────────────────
export interface MemberResponse {
  member_id: number
  email: string
  name: string
  affiliation: string | null
  affiliation_role: AffiliationRole
  role: Role
  profile_url: string | null
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
  member: MemberResponse
}

// ── 시험 ──────────────────────────────────────────────────────────────
export interface ExamResponse {
  exam_id: number
  name: string
  description: string | null
  step: ExamStep
  layout_mode: LayoutMode
  student_count: number
  created_at: string
  updated_at: string | null
  problem_sheet_url: string | null
  model_answer_url: string | null
}

// ── 문제 ──────────────────────────────────────────────────────────────
export interface ProblemResponse {
  problem_id: number
  exam_id: number
  label: string
  type: ProblemType
  max_score: number
  region: Region | null
  language: ProgrammingLanguage | null
  problem_text: string | null
}

export interface ModelAnswerResponse {
  model_answer_id: number | null
  problem_id: number
  correct_choice: number | null
  choice_count: number | null
  accepted_answers: string[] | null
  model_answer_text: string | null
  region: Region | null
}

// ── 루브릭 ────────────────────────────────────────────────────────────
export interface RubricResponse {
  rubric_id: number
  problem_id: number
  text: string
  allocated_score: number
  source: RubricSource
  order_index: number
}

// ── 답안지 / 학생 ────────────────────────────────────────────────────
export interface AnswerSheetResponse {
  answer_sheet_id: number
  exam_id: number
  file_key: string
  status: SheetStatus
  student_id: number | null
  student_name: string | null
  student_no: string | null
}

export interface AnswerSheetDownloadResponse {
  url: string
  student_name_region: Region | null
  student_no_region: Region | null
}

// ── 답안 영역 ────────────────────────────────────────────────────────
export interface AnswerRegionResponse {
  answer_region_id: number
  answer_sheet_id: number
  problem_id: number
  problem_label: string
  shape: RegionShape
  bbox_region: Region | null
  polygon_points: Point[] | null
  layout_mode: LayoutMode
}

// ── OCR ───────────────────────────────────────────────────────────────
export interface OcrProgressResponse {
  confirmed_student_count: number
  total_student_count: number
  students: {
    student_id: number
    name: string
    student_no: string
    confirmed_count: number
    total_count: number
    percent: number
  }[]
}

export interface OcrResultResponse {
  ocr_result_id: number
  problem_id: number
  problem_label: string
  problem_type: ProblemType
  problem_language: ProgrammingLanguage | null
  text: string | null
  marked_choice: number | null
  status: OCRStatus
  answer_sheet_id: number
  shape: RegionShape
  bbox_region: Region | null
  polygon_points: Point[] | null
}

// ── 채점 ──────────────────────────────────────────────────────────────
export interface GradingProgressResponse {
  confirmed_count: number
  total_count: number
  problems: {
    problem_id: number
    label: string
    type: ProblemType
    max_score: number
    confirmed_count: number
    total_count: number
    percent: number
  }[]
}

export interface GradeResponse {
  grade_id: number
  student_id: number
  student_name: string
  student_no: string
  score: number
  max_score: number
  comment: string | null
  status: GradeStatus
  method: GradeMethod
  rubric_breakdown: {
    rubric_id: number
    text: string
    allocated_score: number
    satisfied: boolean
  }[] | null
  ocr_text: string | null
  marked_choice: number | null
  model_answer_text: string | null
}

// ── 성적 ──────────────────────────────────────────────────────────────
export interface ExamResultResponse {
  exam_id: number
  title: string
  problems: { problem_id: number; label: string; max_score: number }[]
  students: {
    student_id: number
    name: string
    student_no: string
    total_score: number
    max_total_score: number
    problem_scores: { problem_id: number; score: number | null; status: GradeStatus | null }[]
  }[]
}

export interface ExamStatisticsResponse {
  total_students: number
  fully_graded_count: number
  average_score: number
  highest_score: number
  lowest_score: number
  score_distribution: { range_label: string; count: number }[]
  problem_stats: { problem_id: number; label: string; max_score: number; average_score: number }[]
}

export interface StudentDetailResultResponse {
  student_id: number
  name: string
  student_no: string
  total_score: number
  max_total_score: number
  grades: GradeResponse[]
}

// ── 비동기 Job ────────────────────────────────────────────────────────
export interface JobStartedResponse {
  job_id: number
  status: 'PENDING'
}

export interface JobResponse {
  job_id: number
  exam_id: number
  problem_id: number | null
  type: JobType
  status: JobStatus
  input_json: object | null
  progress_json: {
    current: number
    total: number
    percent: number
    stage: string
    message: string
    lastUpdatedAt: string
  } | null
  result_json: {
    summary: { processed: number; succeeded: number; failed: number }
    resultRef: { type: string; [key: string]: unknown }
  } | null
  error_json: {
    code: string
    message: string
    retryable: boolean
    category: string
    details?: object
    failedTargets?: object
  } | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string | null
}
