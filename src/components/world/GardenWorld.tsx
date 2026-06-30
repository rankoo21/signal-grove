"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";
import { useGroveStore } from "@/store/useGroveStore";
import { SunDial } from "./SunDial";
import { Rootline } from "./Rootline";
import { FireflyIdentity } from "./FireflyIdentity";
import { ParticleMist } from "./ParticleMist";
import { PollenHint } from "./PollenHint";
import { NoticeBreath } from "./NoticeBreath";
import { DarkSoil } from "@/components/zones/DarkSoil";
import { SeedSculptor } from "@/components/zones/SeedSculptor";
import { RootChamber } from "@/components/zones/RootChamber";
import { Grove } from "@/components/zones/Grove";
import { BloomTheater } from "@/components/zones/BloomTheater";
import { SporeArchive } from "@/components/zones/SporeArchive";

const ZONE_COMPONENTS = {
  soil: DarkSoil,
  sculptor: SeedSculptor,
  roots: RootChamber,
  grove: Grove,
  bloom: BloomTheater,
  spores: SporeArchive,
} as const;

// The single living environment. Zones swap inside it with spatial transitions
// while the Sun Dial, Firefly, Rootline, and mist persist across the whole world.
export function GardenWorld() {
  const zone = useGroveStore((s) => s.zone);
  const refresh = useGroveStore((s) => s.refresh);
  const ZoneView = ZONE_COMPONENTS[zone];

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <main className="relative min-h-screen">
      <ParticleMist density={0.5} />

      <SunDial />
      <FireflyIdentity />
      <NoticeBreath />

      <div className="relative z-10 pb-24 pt-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={zone}
            initial={{ opacity: 0, scale: 0.985, filter: "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.01, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <ZoneView />
          </motion.div>
        </AnimatePresence>
      </div>

      <PollenHint />
      <Rootline />
    </main>
  );
}
