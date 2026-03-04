import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { useI18n } from '@/i18n'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose: () => void
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const { t } = useI18n()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [error, setError] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const scannerId = 'barcode-reader'

    async function startScanner() {
      try {
        const html5QrCode = new Html5Qrcode(scannerId)
        scannerRef.current = html5QrCode

        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 150 } },
          (decodedText) => {
            onScan(decodedText)
            html5QrCode.stop().catch(() => {})
          },
          () => {}
        )
      } catch {
        setError(t('scan_error'))
      }
    }

    startScanner()

    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
  }, [onScan, t])

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-semibold">{t('scan_title')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-sm font-medium">
            {t('scan_cancel')}
          </button>
        </div>
        <div ref={containerRef} className="bg-black">
          <div id="barcode-reader" style={{ width: '100%' }} />
        </div>
        {error && (
          <div className="p-4 text-sm text-red-600 text-center">{error}</div>
        )}
        <div className="p-3 text-center text-xs text-slate-500">
          {t('scan_hint')}
        </div>
      </div>
    </div>
  )
}
