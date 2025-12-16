// Supabase Storage helpers for managing artwork images

import { supabase } from "@/integrations/supabase/client";

const ARTWORK_BUCKET = "artworks";

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

/**
 * Upload artwork image to Supabase Storage
 * @param file - The image file or data URL
 * @param userId - User ID for organizing files
 * @param fileName - Optional custom file name
 * @returns Upload result with public URL and storage path
 */
export async function uploadArtwork(
  file: File | Blob | string,
  userId: string,
  fileName?: string
): Promise<UploadResult> {
  try {
    let fileToUpload: File | Blob;
    let finalFileName: string;

    // Handle data URL (canvas toDataURL)
    if (typeof file === "string" && file.startsWith("data:")) {
      const blob = await dataURLtoBlob(file);
      fileToUpload = blob;
      finalFileName = fileName || `artwork_${Date.now()}.png`;
    } else if (file instanceof File || file instanceof Blob) {
      fileToUpload = file;
      finalFileName = fileName || (file instanceof File ? file.name : `artwork_${Date.now()}.png`);
    } else {
      throw new Error("Invalid file type");
    }

    // Create path: userId/artwork_timestamp.ext
    const fileExt = finalFileName.split(".").pop();
    const timestamp = Date.now();
    const path = `${userId}/artwork_${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .upload(path, fileToUpload, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("Upload error:", error);
      throw error;
    }

    // Get signed URL (bucket is private for security)
    const { data: signedData, error: signedError } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .createSignedUrl(path, 3600); // 1 hour expiry

    if (signedError || !signedData?.signedUrl) {
      console.error("Signed URL error:", signedError);
      throw new Error("Failed to create signed URL");
    }

    return {
      url: signedData.signedUrl,
      path: data.path,
    };
  } catch (error: any) {
    console.error("Error uploading artwork:", error);
    return {
      url: "",
      path: "",
      error: error.message || "Failed to upload artwork",
    };
  }
}

/**
 * Delete artwork from Supabase Storage
 * @param path - Storage path of the file
 */
export async function deleteArtwork(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from(ARTWORK_BUCKET)
      .remove([path]);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error("Error deleting artwork:", error);
    return false;
  }
}

/**
 * Get signed URL for an artwork (async because bucket is private)
 * @param path - Storage path
 * @param expiresIn - URL expiry in seconds (default 1 hour)
 */
export async function getArtworkUrl(path: string, expiresIn: number = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(ARTWORK_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) {
    console.error("Failed to create signed URL:", error);
    return "";
  }
  return data.signedUrl;
}

/**
 * Convert data URL to Blob
 */
async function dataURLtoBlob(dataURL: string): Promise<Blob> {
  const response = await fetch(dataURL);
  return response.blob();
}

/**
 * Save artwork metadata to database with storage reference
 * @param userId - User ID
 * @param storageUrl - Public URL from storage
 * @param storagePath - Storage path
 * @param metadata - Additional artwork metadata
 */
export async function saveArtworkToDatabase(
  userId: string,
  storageUrl: string,
  storagePath: string,
  metadata?: {
    colors_used?: any;
    emotions_used?: any;
    metadata?: any;
  }
) {
  try {
    const { data, error } = await supabase
      .from("artworks")
      .insert({
        user_id: userId,
        image_url: storageUrl,
        storage_path: storagePath,
        colors_used: metadata?.colors_used || null,
        emotions_used: metadata?.emotions_used || null,
        metadata: metadata?.metadata || null,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Error saving artwork to database:", error);
    return { data: null, error: error.message };
  }
}

/**
 * Complete workflow: Upload to storage and save to database
 * @param file - Image file or data URL
 * @param userId - User ID
 * @param metadata - Artwork metadata
 */
export async function saveArtwork(
  file: File | Blob | string,
  userId: string,
  metadata?: {
    colors_used?: any;
    emotions_used?: any;
    metadata?: any;
  }
) {
  // Upload to storage
  const uploadResult = await uploadArtwork(file, userId);

  if (uploadResult.error || !uploadResult.url) {
    return {
      success: false,
      error: uploadResult.error || "Upload failed",
    };
  }

  // Save to database
  const dbResult = await saveArtworkToDatabase(
    userId,
    uploadResult.url,
    uploadResult.path,
    metadata
  );

  if (dbResult.error) {
    // Cleanup: Delete uploaded file if database save fails
    await deleteArtwork(uploadResult.path);
    return {
      success: false,
      error: dbResult.error,
    };
  }

  return {
    success: true,
    data: dbResult.data,
  };
}
