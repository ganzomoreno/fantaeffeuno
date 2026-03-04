// supabase/functions/calculate-scores/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const POINTS_TABLE: Record<number, number> = {
  1:25, 2:22, 3:20, 4:18, 5:16, 6:15, 7:14, 8:13, 9:12, 10:11,
  11:10, 12:9, 13:8, 14:7, 15:6, 16:5, 17:4, 18:3, 19:2, 20:1,
  21:0, 22:0
};

const DOTD_POINTS: Record<number, number> = { 1: 3, 2: 2, 3: 1 };
const MAX_OVERTAKES = 3;
const OVERTAKE_MODIFIER = 0.5;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { race_id } = await req.json();

    // Fetch the race details
    const { data: race } = await supabase.from("races").select("*").eq("id", race_id).single();
    if (!race) throw new Error("Race not found");

    // Fetch all race results
    const { data: results, error: resErr } = await supabase.from("race_results").select("*").eq("race_id", race_id);
    if (resErr) throw resErr;

    // Fetch all lineups for this race
    const { data: lineups, error: linErr } = await supabase.from("lineups").select("*").eq("race_id", race_id);
    if (linErr) throw linErr;

    // Helper to calculate single pilot points
    const calculatePilotPoints = (pilotId: number) => {
      const res = results.find(r => r.pilot_id === pilotId);
      if (!res) return 0;
      if (res.dnf) return 0;

      let pts = POINTS_TABLE[res.end_position] || 0;

      // Overtakes (Grid - End) * 0.5, max 3
      const grids = res.grid_position || res.end_position; // Fallback if no grid
      const overtakes = Math.max(0, grids - res.end_position);
      pts += Math.min(overtakes * OVERTAKE_MODIFIER, MAX_OVERTAKES);

      if (res.fastest_lap) pts += 1;
      if (res.dotd_rank && DOTD_POINTS[res.dotd_rank]) {
        pts += DOTD_POINTS[res.dotd_rank];
      }

      return pts;
    };

    // Prepare table to store Team Race Scores if we want (or just compute dynamically frontend)
    // For now we compute and return. Ideally we'd store team_race_scores in the DB
    const teamScores = [];

    for (const lineup of lineups) {
      let teamScore = 0;
      let usedPilots = [lineup.pilot_1, lineup.pilot_2, lineup.pilot_3];
      
      // Auto Bench Sub
      let hasDnf = false;
      for (let i = 0; i < 3; i++) {
         const pId = usedPilots[i];
         const r = results.find(r => r.pilot_id === pId);
         if (r?.dnf && !hasDnf) {
           hasDnf = true; // Sub in bench pilot!
           usedPilots[i] = lineup.bench_pilot; 
         }
      }

      // Compute total for the valid 3 pilots
      for (const pId of usedPilots) {
        if (pId) {
           teamScore += calculatePilotPoints(pId);
        }
      }

      // We should ideally check for "missing lineup" penalty but skipping for MVP core logic here
      teamScores.push({ profile_id: lineup.profile_id, score: teamScore });
    }

    return new Response(JSON.stringify({ message: "Scores calculated", teamScores }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
