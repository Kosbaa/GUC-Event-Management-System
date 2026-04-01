import React from "react";

export default function QRCodeModal({ isOpen, onClose, qrDataUrl }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg p-6 max-w-sm w-full mx-4 text-center">
        <h3 className="text-xl font-semibold text-yellow-400 mb-4">Event QR Code</h3>

        {qrDataUrl ? (
          <div className="mb-4">
            <img src={qrDataUrl} alt="QR code" className="mx-auto w-48 h-48 object-contain" />
          </div>
        ) : (
          <div className="mb-4 text-gray-400">Generating...</div>
        )}

        <div className="flex gap-2 justify-center">
          {qrDataUrl && (
            <a
              href={qrDataUrl}
              download="event-qr.png"
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white text-sm"
            >
              Download PNG
            </a>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}