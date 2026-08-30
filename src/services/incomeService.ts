import { supabase } from "../lib/supabase";

export async function getIncomes(
  selectedMonth:string
) {

  const [year, month] = selectedMonth.split("-").map(Number);
  const start = `${selectedMonth}-01`;
  const end = `${selectedMonth}-${String(
    new Date(year, month, 0).getDate()
  ).padStart(2, "0")}`;

  const { data, error } =
    await supabase
      .from("incomes")
      .select("*")
      .gte(
        "income_date",
        start
      )
      .lte(
        "income_date",
        end
      );

  if (error) {

    console.log(error);

    return [];
  }

  return data || [];
}

export async function createIncome(
  payload:any
) {

  const { data, error } =
    await supabase
      .from("incomes")
      .insert([payload])
      .select()
      .single();

  if (error) return error;

  // 增加到默认资产（如果存在）
  try {
    const { adjustDefaultAssetValue } = await import("./assetService");
    await adjustDefaultAssetValue(Number(payload.amount || 0));

    // create an asset_distribution_records entry for this income (current month)
    const { createAssetDistribution } = await import("./assetDistributionService");
    const monthKey = (payload.income_date || new Date().toISOString()).slice(0, 7);
    const distPayload: any = {
      month: monthKey,
      amount: Number(payload.amount || 0),
      type: "Liquid Assets",
      note: `income:${data.id}`,
      source: "income",
    };
    if (payload.currency) distPayload.currency = payload.currency;

    try {
      await createAssetDistribution(distPayload);
    } catch (innerErr) {
      console.log("createAssetDistribution failed with source=income, retrying as manual", innerErr);
      try {
        distPayload.source = "manual";
        await createAssetDistribution(distPayload);
      } catch (innerErr2) {
        console.log("Retry createAssetDistribution as manual also failed:", innerErr2);
      }
    }
    } catch (e) {
      console.log("Failed to adjust asset after income create:", e);
    }

  // notify UI listeners that asset distributions changed
  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("asset:updated"));
    }
  } catch (e) {
    // ignore
  }

  return error;
}

export async function updateIncome(
  id:number,
  payload:any
) {

  // fetch existing income to compute delta
  const { data: existing, error: fetchErr } = await supabase
    .from("incomes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const prevAmount = Number((existing && (existing as any).amount) || 0);
  const newAmount = Number(payload.amount || prevAmount);
  const delta = newAmount - prevAmount;

  const { error } = await supabase.from("incomes").update(payload).eq("id", id);

  if (!error && delta !== 0) {
    try {
      const { adjustDefaultAssetValue } = await import("./assetService");
      await adjustDefaultAssetValue(delta);
      // update corresponding asset_distribution_records if exists
      try {
        const { updateAssetDistribution } = await import("./assetDistributionService");
        const monthKey = (existing && (existing as any).income_date || new Date().toISOString()).slice(0,7);
        // find record by note reference is not implemented here; skip updating for now
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.log("Failed to adjust asset after income update:", e);
    }
  }

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("asset:updated"));
    }
  } catch (e) {
    // ignore
  }

  return error;
}

export async function removeIncome(
  id:number
) {

  // fetch existing income to compute delta
  const { data: existing, error: fetchErr } = await supabase
    .from("incomes")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchErr) return fetchErr;

  const prevAmount = Number((existing && (existing as any).amount) || 0);

  const { error } = await supabase.from("incomes").delete().eq("id", id);

  if (!error && prevAmount !== 0) {
    try {
      const { adjustDefaultAssetValue } = await import("./assetService");
      await adjustDefaultAssetValue(-prevAmount);
      // add distribution record removal for this income
      try {
        const { removeAssetDistribution } = await import("./assetDistributionService");
        // best-effort: delete distribution record with matching note 'income:{id}'
        const noteRef = `income:${id}`;
        await supabase.from('asset_distribution_records').delete().eq('note', noteRef);
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.log("Failed to adjust asset after income delete:", e);
    }
  }

  try {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("asset:updated"));
    }
  } catch (e) {
    // ignore
  }

  return error;
}