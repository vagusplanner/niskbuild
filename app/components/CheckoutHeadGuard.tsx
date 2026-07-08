"use client";

import { useEffect } from "react";
import { removeStrayStripePreloads } from "@/lib/checkout-redirect";

/** Strips invalid Stripe checkout preload hints if the browser injects them. */
export default function CheckoutHeadGuard() {
  useEffect(() => {
    removeStrayStripePreloads();

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLLinkElement) {
            if (
              node.rel === "preload" &&
              node.href.includes("stripe.com")
            ) {
              node.remove();
            }
            return;
          }
          if (node instanceof HTMLElement) {
            removeStrayStripePreloads(node);
          }
        });
      }
    });

    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);

  return null;
}
