"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAssets,
  createAsset,
  updateAsset,
  removeAsset,
  updateAssetMainStatus,
} from "@/services/assetService";
import type { Asset, AssetPayload } from "@/types/asset";
import type { Currency } from "@/types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@/utils/currency";

export default function useAssets(selectedMonth: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mutation = useRef(false);

  const [assetName, setAssetName] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [assetCurrency, setAssetCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [assetNote, setAssetNote] = useState("");
  const [assetEditingId, setAssetEditingId] = useState<number | null>(null);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAssets();
      setAssets(data);
      setError("");
    } catch {
      setError("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { const timer = setTimeout(() => void fetchAssets(), 0); return () => clearTimeout(timer); }, [selectedMonth, fetchAssets]);
  useEffect(() => {
    const handler = () => { void fetchAssets(); };
    window.addEventListener("asset:updated", handler);
    return () => window.removeEventListener("asset:updated", handler);
  }, [fetchAssets]);

  async function saveAsset() {
    if (mutation.current) return { success: false, error: "Another change is still saving." };
    mutation.current = true;
    try {
      setLoading(true);
      setError("");

      if (!assetName || assetValue === "") {
        const msg = "Please fill in asset name and current value.";
        setError(msg);
        return { success: false, error: msg };
      }

      const value = Number(assetValue);
      if (!Number.isFinite(value)) {
        const msg = "Current value must be a number.";
        setError(msg);
        return { success: false, error: msg };
      }

      const payload: AssetPayload = {
        name: assetName,
        current_value: value,
        currency: assetCurrency,
        note: assetNote,
      };

      const err = assetEditingId
        ? await updateAsset(assetEditingId, payload)
        : await createAsset(payload);

      if (err) {
        const msg = err.message || "Failed to save asset";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchAssets();
      resetAssetForm();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save asset";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      mutation.current = false;
      setLoading(false);
    }
  }

  function resetAssetForm() {
    setAssetName("");
    setAssetValue("");
    setAssetCurrency(DEFAULT_CURRENCY);
    setAssetNote("");
    setAssetEditingId(null);
  }

  function startEditAsset(asset: Asset) {
    setAssetEditingId(asset.id);
    setAssetName(asset.name);
    setAssetValue(String(asset.current_value));
    setAssetCurrency(normalizeCurrency(asset.currency));
    setAssetNote(asset.note || "");
  }

  async function deleteAssetById(id: number) {
    if (mutation.current) return { success: false, error: "Another change is still saving." };
    mutation.current = true;
    try {
      setLoading(true);
      const err = await removeAsset(id);
      if (err) {
        const msg = err.message || "Failed to delete asset";
        setError(msg);
        return { success: false, error: msg };
      }
      await fetchAssets();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete asset";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      mutation.current = false;
      setLoading(false);
    }
  }

  async function setMainAsset(id: number, isMain: boolean) {
    if (mutation.current) return { success: false, error: "Another change is still saving." };
    mutation.current = true;
    try {
      setLoading(true);
      setError("");

      const err = await updateAssetMainStatus(id, isMain);
      if (err) {
        const msg = err.message || "Failed to update main asset.";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchAssets();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update main asset.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      mutation.current = false;
      setLoading(false);
    }
  }

  return {
    assets,
    fetchAssets,
    loading,
    error,
    assetName,
    setAssetName,
    assetValue,
    setAssetValue,
    assetCurrency,
    setAssetCurrency,
    assetNote,
    setAssetNote,
    assetEditingId,
    startEditAsset,
    saveAsset,
    deleteAssetById,
    setMainAsset,
    resetAssetForm,
  };
}
