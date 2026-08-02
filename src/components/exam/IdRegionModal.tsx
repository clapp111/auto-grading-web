import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { PdfCanvas, type DrawSelection } from "@/components/exam/PdfCanvas";
import { sheetsApi, type IdRegionSaveRequest } from "@/api/sheets";
import type { Region, AnswerSheetResponse } from "@/types/dto";

interface IdRegionModalProps {
  firstSheet: AnswerSheetResponse;
  sheetCount: number;
  onSave: (body: IdRegionSaveRequest) => void;
  onClose: () => void;
  saving: boolean;
}

type RegionTarget = "name" | "student_no";

const COLORS: Record<RegionTarget, string> = {
  name: "#16a86a",
  student_no: "#4F46E5",
};
const LABELS: Record<RegionTarget, string> = {
  name: "이름",
  student_no: "학번",
};

export function IdRegionModal({
  firstSheet,
  sheetCount,
  onSave,
  onClose,
  saving,
}: IdRegionModalProps) {
  const [nameRegion, setNameRegion] = useState<Region | null>(null);
  const [studentNoRegion, setStudentNoRegion] = useState<Region | null>(null);
  const [activeTarget, setActiveTarget] = useState<RegionTarget>("name");
  const [currentPage, setCurrentPage] = useState(1);

  const { data: downloadData } = useQuery({
    queryKey: ["sheet-download", firstSheet.answer_sheet_id],
    queryFn: () =>
      sheetsApi.getDownloadUrl(firstSheet.answer_sheet_id).then((r) => r.data),
  });

  useEffect(() => {
    if (downloadData?.student_name_region)
      setNameRegion(downloadData.student_name_region);
    if (downloadData?.student_no_region)
      setStudentNoRegion(downloadData.student_no_region);
  }, [downloadData]);

  const overlays = [
    ...(nameRegion
      ? [{ region: nameRegion, label: LABELS.name, color: COLORS.name }]
      : []),
    ...(studentNoRegion
      ? [
          {
            region: studentNoRegion,
            label: LABELS.student_no,
            color: COLORS.student_no,
          },
        ]
      : []),
  ];

  const handleDrawComplete = (selection: DrawSelection) => {
    const region = selection.bbox_region;
    if (activeTarget === "name") {
      setNameRegion(region);
      if (!studentNoRegion) setActiveTarget("student_no");
    } else {
      setStudentNoRegion(region);
      if (!nameRegion) setActiveTarget("name");
    }
  };

  const canSave = !!nameRegion && !!studentNoRegion;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(17,20,33,.46)] backdrop-blur-[2px]">
      <div className="bg-white rounded-[18px] shadow-[0_24px_60px_rgba(13,16,28,.34)] overflow-hidden flex flex-col w-[820px] h-[788px]">
        {/* Header */}
        <div className="flex items-start justify-between px-[26px] py-[22px] pb-[18px] border-b border-[#f0f1f4] flex-none">
          <div>
            <h3 className="text-[19px] font-extrabold text-[#15171d] tracking-[-0.02em]">
              학생 식별 영역 지정
            </h3>
            <p className="text-[13.5px] text-[#71757e] mt-[4px]">
              첫 답안지에서 이름·학번 위치를 지정하면 모든 답안지에 자동
              적용됩니다
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-[32px] h-[32px] rounded-[8px] flex items-center justify-center text-[#9aa0ab] bg-[#f4f5f7] hover:bg-[#eef0f3] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex min-h-0">
          {/* PDF Viewer */}
          <div className="flex-[1.3] bg-[#eceef2] p-[22px] flex flex-col min-w-0">
            {/* Toolbar */}
            <div className="flex items-center gap-[8px] mb-[10px] flex-none">
              <span className="flex items-center gap-[5px] h-[30px] px-[11px] border border-accent bg-accent rounded-[8px] text-white text-[12.5px] font-semibold">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                </svg>
                사각형
              </span>
              <span className="flex items-center gap-[5px] h-[30px] px-[11px] border border-[#e2e4e9] bg-white rounded-[8px] text-[#5f636b] text-[12.5px] font-semibold">
                지정할 항목 ·{" "}
                <span
                  style={{ color: COLORS[activeTarget] }}
                  className="font-bold"
                >
                  {LABELS[activeTarget]}
                </span>
              </span>
            </div>

            {/* Target toggles */}
            <div className="flex items-center gap-[6px] mb-[10px] flex-none">
              {(["name", "student_no"] as RegionTarget[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTarget(t)}
                  className="flex items-center gap-[6px] h-[28px] px-[10px] rounded-[7px] text-[12px] font-semibold border transition-colors"
                  style={
                    activeTarget === t
                      ? {
                          background: COLORS[t] + "1a",
                          borderColor: COLORS[t],
                          color: COLORS[t],
                        }
                      : {
                          background: "#fff",
                          borderColor: "#e2e4e9",
                          color: "#8a8f99",
                        }
                  }
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full flex-none"
                    style={{ background: COLORS[t] }}
                  />
                  {LABELS[t]}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0">
              <PdfCanvas
                url={downloadData?.url ?? null}
                pageWidth={300}
                regions={overlays}
                drawMode="rect"
                onDrawComplete={handleDrawComplete}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </div>

          {/* Region list panel */}
          <div className="w-[280px] flex-none border-l border-[#f0f1f4] p-[20px_22px] flex flex-col">
            <p className="text-[13px] font-bold text-[#9aa0ab] tracking-[.04em] mb-[12px]">
              지정된 영역
            </p>

            {(["name", "student_no"] as RegionTarget[]).map((t) => {
              const region = t === "name" ? nameRegion : studentNoRegion;
              return (
                <div
                  key={t}
                  className="flex items-center gap-[10px] border border-[#ebedf1] rounded-[11px] p-[12px_13px] mb-[9px] cursor-pointer hover:bg-[#fafbfc] transition-colors"
                  onClick={() => setActiveTarget(t)}
                >
                  <span
                    className="w-[9px] h-[9px] rounded-full flex-none"
                    style={{ background: COLORS[t] }}
                  />
                  <span className="text-[14px] font-semibold text-[#15171d]">
                    {LABELS[t]}
                  </span>
                  {region ? (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="ml-auto"
                      style={{ color: "#16a86a" }}
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    <span className="ml-auto text-[11px] text-[#c2c6cd] font-medium">
                      미지정
                    </span>
                  )}
                </div>
              );
            })}

            <div className="mt-auto flex items-start gap-[8px] bg-accent/[.04] rounded-[10px] p-[12px_13px] text-[12.5px] text-accent font-semibold leading-[1.5]">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-none mt-[1px]"
              >
                <path
                  d="M12 8v5m0 3h.01"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
              </svg>
              전체 {sheetCount}장에 같은 좌표로 적용됩니다
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-none px-[26px] py-[14px] border-t border-[#f0f1f4] flex items-center justify-end gap-[10px]">
          <button
            type="button"
            onClick={onClose}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              onSave({
                name_region: nameRegion!,
                student_no_region: studentNoRegion!,
              })
            }
            disabled={!canSave || saving}
            className="h-[44px] px-[20px] bg-accent text-white text-[14.5px] font-bold rounded-[11px] shadow-[0_4px_12px_rgba(79,70,229,.3)] hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? "저장 중..." : "적용하고 인식 시작"}
          </button>
        </div>
      </div>
    </div>
  );
}
