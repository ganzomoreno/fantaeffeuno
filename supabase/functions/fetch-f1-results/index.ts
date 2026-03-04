// supabase/functions/fetch-f1-results/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map F1 Team to Pilot ID (Simplified for MVP, ideally we map by driverId from API)
// This will require a bit of manual mapping or matching by name/abbreviation.
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { race_id, round } = await req.json();

    // Fetch from Jolpica F1 API
    // Example: https://api.jolpi.ca/ergast/f1/2026/1/results.json
    const season = 2026;
    const apiUrl = `https://api.jolpi.ca/ergast/f1/${season}/${round}/results.json`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data.MRData.RaceTable.Races.length) {
      return new Response(JSON.stringify({ error: "Race results not available yet" }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const results = data.MRData.RaceTable.Races[0].Results;
    const { data: pilots } = await supabase.from("pilots").select("id, name, f1_team, abbreviation");

    const mappedResults = results.map((r: any) => {
      // Try to match pilot by name or team
      const matchedPilot = pilots?.find(p => 
        p.name.toLowerCase().includes(r.Driver.familyName.toLowerCase()) || 
        p.abbreviation === r.Driver.code
      );

      return {
        race_id,
        pilot_id: matchedPilot?.id,
        grid_position: parseInt(r.grid, 10),
        end_position: parseInt(r.positionText, 10) || 20,
        dnf: r.positionText === "R" || r.positionText === "W" || r.status !== "Finished" && !r.status.includes("+"),
        fastest_lap: r.FastestLap?.rank === "1",
        dotd_rank: null, // Admin must fill this manually later
      };
    }).filter((r: any) => r.pilot_id != null);

    // Upsert results for this race
    const { error: dbError } = await supabase
      .from("race_results")
      .upsert(mappedResults, { onConflict: "race_id, pilot_id" });

    if (dbError) throw dbError;

    // Mark race as completed (or at least locked to indicate data is flowing)
    await supabase.from("races").update({ status: "completed" }).eq("id", race_id);

    return new Response(
      JSON.stringify({ message: "Results parsed and inserted successfully", count: mappedResults.length }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        status: 400,
    });
  }
});
