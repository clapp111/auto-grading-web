export type AffiliationRole = "PROFESSOR" | "TEACHER" | "TUTOR" | "TA";
export type Role = "ADMIN" | "NORMAL";
export type ExamStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type JobType =
  | "MODEL_ANSWER_OCR"
  | "RUBRIC_SUGGEST"
  | "ANSWER_SHEET_RECOGNIZE"
  | "REGION_TEMPLATE_APPLY"
  | "ANSWER_OCR_RUN"
  | "AUTO_GRADE"
  | "LLM_GRADE"
  | "EXPORT_CSV";
export type JobStatus = "PENDING" | "RUNNING" | "DONE" | "FAILED" | "CANCELED";
export type ProblemType =
  "MULTIPLE_CHOICE" | "SHORT_ANSWER" | "DESCRIPTIVE" | "CODING";
export type ProgrammingLanguage = "CPP" | "JAVA" | "PYTHON" | "C";
export type RubricSource = "LLM" | "HUMAN";
export type SheetStatus = "MATCHED" | "UNMATCHED";
export type RegionShape = "RECT" | "LASSO";
export type LayoutMode = "FIXED" | "FREE";
export type OCRStatus = "RAW" | "REVIEWED";
export type GradeStatus = "CONFIRMED" | "SUGGESTED";
export type GradeMethod = "AUTO" | "LLM" | "HUMAN";
