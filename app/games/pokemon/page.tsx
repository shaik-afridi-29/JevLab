"use client";

import { Playground } from "@/components/playground";
import { uid } from "@/lib/utils";

export default function PokemonPage() {
  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.04] p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber-200/70">Player · Pikachu Lv24</div>
          <div className="mt-1 text-[14px] font-semibold">HP 62/78 · Electric · Fast</div>
          <div className="mt-1 text-[12.5px] text-mist-400">Thunderbolt · Quick Attack — Electric is weak vs Ground.</div>
        </div>
        <div className="rounded-2xl border border-red-400/20 bg-red-400/[0.04] p-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-red-200/70">Enemy · Geodude Lv22</div>
          <div className="mt-1 text-[14px] font-semibold">HP 70/70 · Rock/Ground · Slow, high defense</div>
          <div className="mt-1 text-[12.5px] text-mist-400">Rock Throw · Tackle — resists Electric.</div>
        </div>
      </div>
      <Playground
        title="Pokémon Battle"
        subtitle="Strategy simulator: which move, is attacking advisable, how dangerous is this?"
        edu="Noul gates the attack decision, Choice picks the move, Score rates danger — three primitives, one battlefield state. Swap HP or types and rerun to feel state-sensitivity."
        initial={{
          id: uid("exp"), name: "Pokémon Battle", description: "Pikachu vs Geodude",
          state: "Player: Pikachu Lv24 HP 62/78 Electric, Thunderbolt/Quick Attack, fast. Enemy: Geodude Lv22 HP 70/70 Rock/Ground, Rock Throw/Tackle, slow, high defense. No status. Electric weak vs Ground.",
          questions: [
            { id: uid("q"), name: "move", type: "choice", instructions: "Which move should the player select?", criteria: { thunderbolt: "Strong electric, weak vs ground/rock.", quick_attack: "Fast weak normal, strikes first.", switch_out: "Withdraw Pikachu." } },
            { id: uid("q"), name: "attack_ok", type: "noul", instructions: "Is attacking advisable in this position?", criteria: {} },
            { id: uid("q"), name: "danger", type: "score", instructions: "How dangerous is the current situation?", criteria: ["Safe", "Mild pressure", "Risky", "Very dangerous", "Near wipe"] },
          ],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: ["game", "pokemon"], kind: "mixed",
        }}
      />
    </div>
  );
}
