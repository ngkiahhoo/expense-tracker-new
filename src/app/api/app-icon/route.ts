import { NextResponse } from "next/server";

import { APP_ICON_BUCKET, APP_ICON_PATH } from "@/utils/appIcon";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const noStoreHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(request: Request) {
  const { data, error } = await supabase.storage
    .from(APP_ICON_BUCKET)
    .download(APP_ICON_PATH);

  if (data && !error) {
    return new Response(data, {
      headers: {
        ...noStoreHeaders,
        "Content-Type": data.type || "image/png",
      },
    });
  }

  return NextResponse.redirect(new URL("/icon.svg", request.url), {
    headers: noStoreHeaders,
  });
}
