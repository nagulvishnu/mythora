"use client";
import dynamic from "next/dynamic";

const MythoraApp = dynamic(() => import("./MythoraApp"), {
  ssr: false,
  loading: () => (
    <div className="boot">
      <div className="loading-rune">✦</div>
      <div className="loading-title">MYTHORA</div>
    </div>
  ),
});

export default function MythoraClient() {
  return <MythoraApp />;
}
