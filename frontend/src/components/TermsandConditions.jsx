import React from "react";
import { useNavigate } from "react-router-dom";

export default function TermsAndConditions() {
  const navigate = useNavigate();
  const lastUpdated = "November 26, 2025";

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-gray-800 rounded-lg shadow p-6">
        <header className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold">Terms &amp; Conditions</h1>
            <p className="text-sm text-gray-400">Last updated: {lastUpdated}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Print
            </button>
            <button
              onClick={() => navigate(-1)}
              className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded"
            >
              Close
            </button>
          </div>
        </header>

        <article className="prose prose-invert max-w-none text-sm leading-relaxed">
          <section>
            <h2>1. Acceptance</h2>
            <p>
              By using the GUC Loyalty Program or submitting an application, you
              agree to these Terms &amp; Conditions. These Terms govern your
              access to and use of the services and features provided by the
              platform.
            </p>
          </section>

          <section>
            <h2>2. Eligibility</h2>
            <p>
              Vendors must be legally registered entities and hold any
              necessary permits required to operate in their jurisdiction.
            </p>
          </section>

          <section>
            <h2>3. Application and Approval</h2>
            <p>
              Submitting an application does not guarantee approval. The
              platform reserves the right to accept or reject any application at
              its discretion.
            </p>
          </section>

          <section>
            <h2>4. Cancellation &amp; Termination</h2>
            <p>
              Approved loyalty programs may be canceled by the vendor. When a
              vendor cancels an approved application, the application status
              will change to "canceled" and the vendor may submit a new
              application following the platform's rules.
            </p>
          </section>

          <section>
            <h2>5. Data &amp; Privacy</h2>
            <p>
              Any data collected during application and program participation
              will be handled according to the platform's Privacy Policy.
            </p>
          </section>

          <section>
            <h2>6. Liability</h2>
            <p>
              The platform is not liable for indirect, incidental, or punitive
              damages arising from participation in the loyalty program.
            </p>
          </section>

          <section>
            <h2>7. Changes to Terms</h2>
            <p>
              The platform may update these Terms &amp; Conditions from time to
              time. When changes are made, the updated date above will be
              revised.
            </p>
          </section>

          <section>
            <h2>8. Contact</h2>
            <p>
              If you have questions about these Terms, please contact support at
              <a className="text-blue-400 hover:underline" href="mailto:support@example.com">
                support@example.com
              </a>.
            </p>
          </section>

          <footer className="mt-6 border-t border-gray-700 pt-4 text-right text-sm text-gray-400">
            <p>© {new Date().getFullYear()} GUC Loyalty Program. All rights reserved.</p>
          </footer>
        </article>
      </div>
    </div>
  );
}
