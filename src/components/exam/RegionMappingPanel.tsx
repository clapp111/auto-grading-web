import { Trash2, Loader2 } from "lucide-react";

export interface MappingItem {
  key: string;
  index: number;
  problemLabel: string;
  color: string; // TYPE_COLORS — 배경 틴트, 점
  textColor: string; // TYPE_TEXT_COLORS — 라벨 텍스트
  serverId: number | null;
  tempId: string | null;
  isPending?: boolean; // true: 서버 저장 응답 대기 중
}

interface SheetThumbProps {
  idx: number;
  isActive: boolean;
  onClick: () => void;
}

function SheetThumb({ idx, isActive, onClick }: SheetThumbProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`답안지 ${idx + 1}`}
      className="w-[40px] h-[52px] rounded-[6px] flex-none transition-all"
      style={
        isActive
          ? {
              background: "#4F46E5" + "12",
              border: "2px solid #4F46E5",
            }
          : {
              background: "linear-gradient(160deg,#f4f5f7,#e9ebef)",
              border: "1px solid #e2e4e9",
            }
      }
    />
  );
}

interface RegionMappingPanelProps {
  mappingList: MappingItem[];
  sheets: { answer_sheet_id: number }[];
  selectedSheetIdx: number;
  onSelectSheet: (idx: number) => void;
  onDeleteServer: (id: number) => void;
  onDeleteLocal: (tempId: string) => void;
  isFineTuneMode: boolean;
}

export function RegionMappingPanel({
  mappingList,
  sheets,
  selectedSheetIdx,
  onSelectSheet,
  onDeleteServer,
  onDeleteLocal,
  isFineTuneMode,
}: RegionMappingPanelProps) {
  const handleDelete = (item: MappingItem) => {
    if (item.serverId !== null) {
      onDeleteServer(item.serverId);
    } else if (item.tempId !== null) {
      onDeleteLocal(item.tempId);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-[20px] py-[18px] pb-[12px] text-[14.5px] font-bold text-[#15171d] flex-none border-b border-[#f0f1f4]">
        영역 → 문제 매핑
      </div>

      {/* Mapping list */}
      <div className="flex-1 overflow-y-auto px-[16px] py-[12px] flex flex-col gap-[9px]">
        {mappingList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-[8px] text-center">
            <div
              className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
              style={{ background: "#f0f1f4" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect
                  x="4"
                  y="4"
                  width="16"
                  height="16"
                  rx="2"
                  stroke="#9aa0ab"
                  strokeWidth="1.6"
                />
              </svg>
            </div>
            <p className="text-[13px] text-[#9aa0ab]">
              {isFineTuneMode
                ? "영역이 없습니다"
                : "캔버스에 영역을 그려주세요"}
            </p>
          </div>
        ) : (
          mappingList.map((item) => (
            <div
              key={item.key}
              className="group border border-[#ebedf1] rounded-[11px] px-[14px] py-[13px] flex items-center gap-[11px] hover:bg-[#fafbfc] transition-colors"
            >
              {/* Problem label */}
              <span
                className="w-[8px] h-[8px] rounded-full flex-none"
                style={{ background: item.color }}
              />
              <span className="text-[14px] font-bold flex-1 min-w-0 text-[#15171d]">
                {item.problemLabel}
              </span>

              {/* Pending spinner or delete */}
              {item.isPending ? (
                <Loader2
                  size={13}
                  className="animate-spin text-[#c5c9d0] flex-none ml-[2px]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => handleDelete(item)}
                  className="text-[#c2c6cd] hover:text-[#9aa0ab] transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Thumbnail strip — only shown in fine-tune mode */}
      {isFineTuneMode && sheets.length > 0 && (
        <div className="flex-none px-[18px] py-[16px] border-t border-[#f0f1f4]">
          <p className="text-[12px] text-[#9aa0ab] font-semibold mb-[9px]">
            답안지 {selectedSheetIdx + 1} / {sheets.length}
          </p>
          <div className="flex gap-[8px] items-center overflow-x-auto pb-[4px]">
            {sheets.map((_, i) => (
              <SheetThumb
                key={i}
                idx={i}
                isActive={i === selectedSheetIdx}
                onClick={() => onSelectSheet(i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
