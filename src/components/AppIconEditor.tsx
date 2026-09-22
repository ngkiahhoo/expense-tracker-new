"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NextImage from "next/image";
import Cropper, { type Area } from "react-easy-crop";
import { Check, Image as ImageIcon, RotateCcw, Upload, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  APP_ICON_BUCKET,
  APP_ICON_PATH,
  APP_ICON_ROUTE,
  APP_ICON_SIZE,
} from "@/utils/appIcon";

interface AppIconEditorProps {
  open: boolean;
  onClose: () => void;
}

type SaveState = "idle" | "saving" | "saved" | "error";

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

function refreshIconLinks() {
  const nextHref = `${APP_ICON_ROUTE}?rev=${Date.now()}`;
  const iconLinks = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
  );

  iconLinks.forEach((link) => {
    link.href = nextHref;
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded."));
    image.src = src;
  });
}

async function createIconBlob(src: string, crop: Area) {
  const image = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = APP_ICON_SIZE;
  canvas.height = APP_ICON_SIZE;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas is not available in this browser.");
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.clearRect(0, 0, APP_ICON_SIZE, APP_ICON_SIZE);
  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    APP_ICON_SIZE,
    APP_ICON_SIZE,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the app icon."));
    }, "image/png");
  });
}

export default function AppIconEditor({ open, onClose }: AppIconEditorProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [imageSrc, setImageSrc] = useState("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");
  const [iconRevision, setIconRevision] = useState(0);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  useEffect(() => {
    return () => {
      if (imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const currentIconSrc = useMemo(
    () => `${APP_ICON_ROUTE}?preview=${iconRevision}`,
    [iconRevision],
  );

  const handleFileChange = useCallback((file: File | undefined) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setSaveState("error");
      setMessage("Please choose an image file.");
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      setSaveState("error");
      setMessage("Image is too large. Choose a file under 10 MB.");
      return;
    }

    if (imageSrc.startsWith("blob:")) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setSaveState("idle");
    setMessage("");
  }, [imageSrc]);

  const saveIcon = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      setSaveState("error");
      setMessage("Choose and position an image first.");
      return;
    }

    setSaveState("saving");
    setMessage("Saving icon...");

    try {
      const blob = await createIconBlob(imageSrc, croppedAreaPixels);
      const { error } = await supabase.storage
        .from(APP_ICON_BUCKET)
        .upload(APP_ICON_PATH, blob, {
          cacheControl: "0",
          contentType: "image/png",
          upsert: true,
        });

      if (error) throw error;

      refreshIconLinks();
      setIconRevision((current) => current + 1);
      setSaveState("saved");
      setMessage("Saved. Delete the old Home Screen icon, then add this site again in Safari.");
    } catch (cause) {
      setSaveState("error");
      setMessage(cause instanceof Error ? cause.message : "Icon upload failed.");
    }
  }, [croppedAreaPixels, imageSrc]);

  const resetIcon = useCallback(async () => {
    setSaveState("saving");
    setMessage("Resetting icon...");

    try {
      const { error } = await supabase.storage
        .from(APP_ICON_BUCKET)
        .remove([APP_ICON_PATH]);

      if (error) throw error;

      refreshIconLinks();
      setIconRevision((current) => current + 1);
      setImageSrc("");
      setSaveState("saved");
      setMessage("Default icon restored.");
    } catch (cause) {
      setSaveState("error");
      setMessage(cause instanceof Error ? cause.message : "Could not reset the icon.");
    }
  }, []);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="app-icon-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-modal="true"
        className="app-icon-modal"
        role="dialog"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="app-icon-modal-header">
          <div>
            <p className="app-icon-eyebrow">App icon</p>
            <h2>Choose icon image</h2>
          </div>
          <button type="button" className="app-icon-close" onClick={onClose} aria-label="Close icon editor">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="app-icon-current">
          <NextImage src={currentIconSrc} alt="" width={64} height={64} unoptimized />
          <div>
            <p>Current Home Screen icon</p>
            <span>Safari will use the saved PNG when you add the app again.</span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          className="sr-only"
          onChange={(event) => handleFileChange(event.target.files?.[0])}
        />

        <button type="button" className="app-icon-upload" onClick={() => inputRef.current?.click()}>
          <Upload size={18} aria-hidden="true" />
          Select image
        </button>

        <div className="app-icon-crop-frame" aria-label="Crop app icon">
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              minZoom={1}
              maxZoom={4}
              showGrid={false}
              cropSize={{ width: 260, height: 260 }}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)}
            />
          ) : (
            <div className="app-icon-empty">
              <ImageIcon size={34} aria-hidden="true" />
              <p>Pick a photo or graphic to crop.</p>
            </div>
          )}
        </div>

        <label className="app-icon-slider">
          <span>Zoom</span>
          <input
            type="range"
            min="1"
            max="4"
            step="0.01"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
            disabled={!imageSrc}
          />
        </label>

        <div className="app-icon-actions">
          <button type="button" className="app-icon-secondary" onClick={resetIcon} disabled={saveState === "saving"}>
            <RotateCcw size={18} aria-hidden="true" />
            Reset
          </button>
          <button type="button" className="app-icon-primary" onClick={saveIcon} disabled={!imageSrc || saveState === "saving"}>
            <Check size={18} aria-hidden="true" />
            {saveState === "saving" ? "Saving..." : "Save icon"}
          </button>
        </div>

        {message && (
          <p className={`app-icon-message ${saveState === "error" ? "app-icon-message-error" : ""}`} role="status">
            {message}
          </p>
        )}
      </section>
    </div>,
    document.body,
  );
}
