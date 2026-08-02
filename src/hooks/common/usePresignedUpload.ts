import { useState } from "react";
import axios from "axios";
import type { PresignedUrlResponse } from "@/types/dto";

interface UploadOptions {
  onProgress?: (percent: number) => void;
}

export function usePresignedUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const upload = async (
    presigned: PresignedUrlResponse,
    file: File,
    options?: UploadOptions,
  ) => {
    setUploading(true);
    setProgress(0);
    try {
      await axios.put(presigned.upload_url, file, {
        headers: { "Content-Type": file.type },
        onUploadProgress: (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setProgress(pct);
          options?.onProgress?.(pct);
        },
      });
      return presigned.file_key;
    } finally {
      setUploading(false);
    }
  };

  return { upload, uploading, progress };
}
