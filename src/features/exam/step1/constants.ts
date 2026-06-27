import type { ProblemType } from '@/types/enums'

export const TYPE_COLORS: Record<ProblemType, string> = {
  MULTIPLE_CHOICE: '#7c5cfc',
  SHORT_ANSWER: '#0ea5e9',
  DESCRIPTIVE: '#14b8a6',
  CODING: '#f59e0b',
}

export const TYPE_TEXT_COLORS: Record<ProblemType, string> = {
  MULTIPLE_CHOICE: '#7c5cfc',
  SHORT_ANSWER: '#0284c7',
  DESCRIPTIVE: '#0d9488',
  CODING: '#d68310',
}

export const TYPE_LABELS_KO: Record<ProblemType, string> = {
  MULTIPLE_CHOICE: '객관식',
  SHORT_ANSWER: '단답형',
  DESCRIPTIVE: '서술형',
  CODING: '손코딩',
}

export const PROBLEM_TYPES: ProblemType[] = [
  'MULTIPLE_CHOICE',
  'SHORT_ANSWER',
  'DESCRIPTIVE',
  'CODING',
]

export const OCR_REQUIRED_TYPES: ProblemType[] = ['DESCRIPTIVE', 'CODING']
