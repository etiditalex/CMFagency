"use client";

import dynamic from "next/dynamic";

import type { CmfAwardsTicketModalProps } from "@/components/CmfAwardsTicketModal";

const CmfAwardsTicketModal = dynamic(() => import("@/components/CmfAwardsTicketModal"), { ssr: false });

/**
 * Checkout is a small fraction of visits, so the modal (with framer-motion and the Paystack
 * SDK behind it) stays out of the initial bundle. Returning early on `open` is what defers the
 * chunk request — rendering the dynamic component at all would fetch it on mount.
 */
export default function CmfAwardsTicketModalLazy(props: CmfAwardsTicketModalProps) {
  if (!props.open) return null;
  return <CmfAwardsTicketModal {...props} />;
}
