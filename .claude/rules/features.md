# Feature Details

## PDF viewer

`PdfCanvas` ([src/components/exam/PdfCanvas.tsx](../../src/components/exam/PdfCanvas.tsx)) renders a PDF page with `react-pdf` and overlays a Konva `Stage` for drawing answer regions. Supports two draw modes:

- **RECT**: drag to draw a bounding box
- **LASSO**: click vertices, double-click to close the polygon (Esc cancels)

Region coordinates are stored as fractions of the rendered stage size (`x, y, w, h` in `[0, 1]`).

## 7-step exam workflow

The core product is a linear grading workflow under `/exam/:examId/step/:step`. `ExamSidebar` ([src/components/common/ExamSidebar.tsx](../../src/components/common/ExamSidebar.tsx)) shows progress across all steps and allows navigation.

| Step | Route    | Purpose                                                                                                          |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| 1    | `step/1` | Problem sheet setup — 3 sub-steps: draw problem regions + set types, run model-answer OCR, enter correct answers |
| 2    | `step/2` | Rubric setup — only for `DESCRIPTIVE`/`CODING` problems; AI (LLM) can suggest rubric criteria                    |
| 3    | `step/3` | Upload student roster / answer sheets                                                                            |
| 4    | `step/4` | Draw answer regions on student sheets                                                                            |
| 5    | `step/5` | Review & confirm OCR results per student per problem                                                             |
| 6    | `step/6` | Run auto/LLM grading and confirm grades                                                                          |
| 7    | `step/7` | View results, statistics, export CSV                                                                             |

Step 1 has internal sub-step state managed in the page component itself (not via URL).
