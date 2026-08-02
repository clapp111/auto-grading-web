import { useState, useRef, useEffect, useCallback } from "react";

const CROP_SIZE = 300;
const CROP_OUT = 400;

export default function AvatarCropModal({
  file,
  onApply,
  onCancel,
}: {
  file: File;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
}) {
  const [imageSrc, setImageSrc] = useState("");
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, ox: 0, oy: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const minZoom =
    natural.w > 0 ? Math.max(CROP_SIZE / natural.w, CROP_SIZE / natural.h) : 1;
  const maxZoom = minZoom * 3;

  const clampOffset = useCallback(
    (ox: number, oy: number, z: number) => {
      const maxX = Math.max(0, (natural.w * z) / 2 - CROP_SIZE / 2);
      const maxY = Math.max(0, (natural.h * z) / 2 - CROP_SIZE / 2);
      return {
        x: Math.min(maxX, Math.max(-maxX, ox)),
        y: Math.min(maxY, Math.max(-maxY, oy)),
      };
    },
    [natural],
  );

  const onImgLoad = () => {
    const img = imgRef.current!;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    setNatural({ w, h });
    setZoom(Math.max(CROP_SIZE / w, CROP_SIZE / h));
    setOffset({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    dragStart.current = {
      mx: e.clientX,
      my: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return;
    setOffset(
      clampOffset(
        dragStart.current.ox + e.clientX - dragStart.current.mx,
        dragStart.current.oy + e.clientY - dragStart.current.my,
        zoom,
      ),
    );
  };

  const stopDrag = () => {
    dragging.current = false;
  };

  const changeZoom = (z: number) => {
    const cz = Math.min(maxZoom, Math.max(minZoom, z));
    setZoom(cz);
    setOffset((o) => clampOffset(o.x, o.y, cz));
  };

  const apply = () => {
    const img = imgRef.current!;
    const canvas = document.createElement("canvas");
    canvas.width = CROP_OUT;
    canvas.height = CROP_OUT;
    const ctx = canvas.getContext("2d")!;
    const srcX = natural.w / 2 - CROP_SIZE / 2 / zoom - offset.x / zoom;
    const srcY = natural.h / 2 - CROP_SIZE / 2 / zoom - offset.y / zoom;
    const srcSize = CROP_SIZE / zoom;
    ctx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, CROP_OUT, CROP_OUT);
    onApply(canvas.toDataURL("image/jpeg", 0.9));
  };

  const dw = natural.w * zoom;
  const dh = natural.h * zoom;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-[2px]">
      <div
        className="bg-white rounded-2xl shadow-xl p-8 w-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[18px] font-extrabold text-[#15171d] tracking-[-0.02em] mb-6">
          프로필 사진 편집
        </h3>

        {/* Circular crop area */}
        <div className="flex justify-center mb-5">
          <div
            className="relative overflow-hidden rounded-full cursor-grab active:cursor-grabbing bg-[#e5e7eb] select-none"
            style={{ width: CROP_SIZE, height: CROP_SIZE }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={stopDrag}
            onMouseLeave={stopDrag}
          >
            {imageSrc && (
              <img
                ref={imgRef}
                src={imageSrc}
                onLoad={onImgLoad}
                draggable={false}
                alt=""
                style={{
                  position: "absolute",
                  width: dw,
                  height: dh,
                  left: CROP_SIZE / 2 - dw / 2 + offset.x,
                  top: CROP_SIZE / 2 - dh / 2 + offset.y,
                  userSelect: "none",
                  pointerEvents: "none",
                }}
              />
            )}
          </div>
        </div>

        {/* Zoom slider */}
        <div className="flex items-center gap-3 mb-7">
          <span className="text-[12px] text-[#9aa0ab] flex-none w-8 text-right">
            작게
          </span>
          <input
            type="range"
            min={minZoom}
            max={maxZoom}
            step={(maxZoom - minZoom) / 200}
            value={zoom}
            onChange={(e) => changeZoom(Number(e.target.value))}
            className="flex-1 accent-accent cursor-pointer"
          />
          <span className="text-[12px] text-[#9aa0ab] flex-none w-8">크게</span>
        </div>

        <div className="flex justify-end gap-[10px]">
          <button
            type="button"
            onClick={onCancel}
            className="h-[44px] px-[18px] border border-[#e0e3e9] bg-white rounded-[11px] text-[14px] text-[#4b4f57] font-semibold hover:bg-[#f7f8fa] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={apply}
            className="h-[44px] px-5 bg-accent text-white rounded-[11px] text-[14px] font-bold shadow-[0_4px_12px_rgba(79,70,229,.25)]"
          >
            적용
          </button>
        </div>
      </div>
    </div>
  );
}
