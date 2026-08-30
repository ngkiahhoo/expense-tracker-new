"use client";

import { useEffect, useState } from "react";
import {
  getAssets,
  createAsset,
  updateAsset,
  removeAsset,
  updateAssetMainStatus,
  getMonthlyAllocationTotal,
  createAssetAllocation,
  removeAssetAllocation,
} from "@/services/assetService";
import type { Asset, AssetPayload, AssetAllocationPayload } from "@/types/asset";
import type { Currency } from "@/types/currency";
import { DEFAULT_CURRENCY, normalizeCurrency } from "@/utils/currency";

export default function useAssets(selectedMonth: string) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [assetName, setAssetName] = useState("");
  const [assetValue, setAssetValue] = useState("");
  const [assetCurrency, setAssetCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [assetNote, setAssetNote] = useState("");
  const [assetEditingId, setAssetEditingId] = useState<number | null>(null);

  const [allocationAssetId, setAllocationAssetId] = useState("");
  const [allocationAmount, setAllocationAmount] = useState("");
  const [allocatedAmount, setAllocatedAmount] = useState(0);

  useEffect(() => {
    fetchAll();
  }, [selectedMonth]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      void fetchAssets();
    };

    window.addEventListener("asset:updated", handler);
    return () => window.removeEventListener("asset:updated", handler);
  }, []);

  async function fetchAssets() {
    setLoading(true);
    try {
      const data = await getAssets();
      setAssets(data);
    } catch {
      setError("Failed to fetch assets");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllocatedAmount() {
    setLoading(true);
    try {
      const total = await getMonthlyAllocationTotal(selectedMonth);
      setAllocatedAmount(total);
    } catch {
      setError("Failed to fetch allocation total");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAll() {
    await Promise.all([fetchAssets(), fetchAllocatedAmount()]);
  }

  async function saveAsset() {
    try {
      setLoading(true);
      setError("");

      if (!assetName || assetValue === "") {
        const msg = "Please fill in asset name and current value.";
        setError(msg);
        return { success: false, error: msg };
      }

      const value = Number(assetValue);
      if (Number.isNaN(value)) {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteAssetById(id: number) {
    try {
      setLoading(true);
      const err = await removeAsset(id);
      if (err) {
        const msg = err.message || "Failed to delete asset";
        setError(msg);
        return { success: false, error: msg };
      }
      await fetchAssets();
      await fetchAllocatedAmount();
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete asset";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  async function setMainAsset(id: number, isMain: boolean) {
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
      setLoading(false);
    }
  }

  async function allocateAsset(assetId: number, amount: number) {
    try {
      setLoading(true);
      setError("");

      if (!assetId || amount <= 0) {
        const msg = "Please select an asset and enter a valid allocation amount.";
        setError(msg);
        return { success: false, error: msg };
      }

      const asset = assets.find((item) => item.id === assetId);
      if (!asset) {
        const msg = "Selected asset not found.";
        setError(msg);
        return { success: false, error: msg };
      }

      const allocationData: AssetAllocationPayload = {
        asset_id: assetId,
        month: selectedMonth,
        amount,
      };

      const { data, error } = await createAssetAllocation(allocationData);
      if (error || !data) {
        const msg = error?.message || "Failed to record allocation.";
        setError(msg);
        return { success: false, error: msg };
      }

      const updateError = await updateAsset(assetId, {
        current_value: asset.current_value + amount,
      });

      if (updateError) {
        await removeAssetAllocation(data.id);
        const msg = updateError.message || "Failed to update asset value.";
        setError(msg);
        return { success: false, error: msg };
      }

      await fetchAssets();
      await fetchAllocatedAmount();
      setAllocationAssetId("");
      setAllocationAmount("");
      return { success: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to allocate asset.";
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  return {
    assets,
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
    allocationAssetId,
    setAllocationAssetId,
    allocationAmount,
    setAllocationAmount,
    allocatedAmount,
    fetchAllocatedAmount,
    allocateAsset,
  };
}
