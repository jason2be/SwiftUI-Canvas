"use client";

import React from "react";
import { iconFor } from "@/lib/iconMap";
import { glyphFor } from "@/lib/symbols";

/* Draws an SF Symbol by name: a Lucide lookalike when mapped, otherwise the
 * approximation glyph from lib/symbols.ts. Size in pt, color inherited or given. */

interface Props {
  name?: string | null;
  size: number;
  color?: string;
  weight?: number;
}

export default function Icon({ name, size, color, weight = 2 }: Props) {
  if (!name) return null;
  const Cmp = iconFor(name);
  if (Cmp) {
    return (
      <Cmp
        size={size}
        color={color ?? "currentColor"}
        strokeWidth={weight}
        aria-hidden
        style={{ flex: "none", display: "block" }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        fontSize: size,
        color: color ?? "currentColor",
        lineHeight: 1,
        display: "inline-flex",
        alignItems: "center",
      }}
    >
      {glyphFor(name)}
    </span>
  );
}
