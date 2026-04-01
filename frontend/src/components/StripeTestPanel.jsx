import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import api from "../lib/axios";

const publishableKey = process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise =
  publishableKey.trim() !== ""
    ? loadStripe(publishableKey)
    : Promise.resolve(null);

const currencyFormatter = new Intl.NumberFormat("en-EG", {
  style: "currency",
  currency: "EGP",
});

export default function StripeTestPanel() {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleTestCheckout = async () => {
    if (!publishableKey) {
      setStatus(
        "Missing REACT_APP_STRIPE_PUBLISHABLE_KEY. Please add it to the frontend .env."
      );
      return;
    }

    setLoading(true);
    setStatus("Creating Stripe Checkout session...");

    try {
      const response = await api.post("/payments/test-checkout", {
        amount: 5000, // 50 EGP (stored in qirsh)
        label: "Student Portal Sandbox Test",
        description: "Test charge triggered from the Student dashboard",
      });

      if (response.data?.url) {
        setStatus("Redirecting to Stripe Checkout...");
        window.location.assign(response.data.url);
        return;
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error(
          "Stripe.js failed to initialize and no checkout URL was returned."
        );
      }

      setStatus("Redirecting to Stripe Checkout via Stripe.js...");
      const { error } = await stripe.redirectToCheckout({
        sessionId: response.data.id,
      });

      if (error) {
        throw error;
      }
    } catch (err) {
      console.error("Stripe test checkout error:", err);
      setStatus(err?.message || "Unable to start Stripe Checkout session.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-yellow-400">
          Stripe Sandbox Demo
        </h2>
        <p className="text-sm text-gray-400 mt-1 leading-relaxed">
          Trigger a 50 EGP test payment using Stripe Checkout. Stripe will stay
          in test mode, so use any test card like{" "}
          <code className="px-1 py-0.5 bg-gray-800 rounded">4242 4242 4242 4242</code>{" "}
          with any future expiry.
        </p>
      </div>

      <div className="bg-gray-800 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm text-gray-300">
          <span>Amount</span>
          <span className="font-semibold text-white">
            {currencyFormatter.format(50)}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-300">
          <span>Mode</span>
          <span className="font-semibold text-white">Test / Sandbox</span>
        </div>
      </div>

      <button
        onClick={handleTestCheckout}
        disabled={loading}
        className="w-full px-4 py-3 rounded-xl font-semibold bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition text-white"
      >
        {loading ? "Preparing Checkout..." : "Pay 50 EGP in Test Mode"}
      </button>

      {status && (
        <div className="text-sm text-gray-300 bg-gray-800/70 rounded-lg px-3 py-2">
          {status}
        </div>
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>
          After confirming payment on Stripe, check the{" "}
          <a
            href="https://dashboard.stripe.com/test/payments"
            target="_blank"
            rel="noreferrer"
            className="text-yellow-400 underline"
          >
            Stripe test dashboard
          </a>{" "}
          to see the new charge appear instantly.
        </p>
        <p>
          Cancel the checkout page to return here without completing the
          payment.
        </p>
      </div>
    </div>
  );
}
