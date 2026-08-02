import { useCallback, useRef } from "react";
import { toast } from "sonner";

export function useLockedToast(message = "수정하려면 수정 버튼을 눌러주세요") {
  const activeRef = useRef(false);

  return useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    toast.info(message, {
      duration: 2000,
      onDismiss: () => {
        activeRef.current = false;
      },
      onAutoClose: () => {
        activeRef.current = false;
      },
    });
  }, [message]);
}
