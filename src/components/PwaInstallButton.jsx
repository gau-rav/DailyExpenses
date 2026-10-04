import { useState } from 'react'
import { Download, X } from 'lucide-react'

const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

export default function PwaInstallButton({ installPrompt, setInstallPrompt, installed, setInstalled }) {
  const [helpOpen, setHelpOpen] = useState(false)

  const installApp = async () => {
    if (!installPrompt) {
      setHelpOpen(true)
      return
    }

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      if (choice.outcome === 'accepted') setInstalled(true)
      setInstallPrompt(null)
    } catch (error) {
      console.error('Unable to show the PaisaWise install prompt:', error)
      setHelpOpen(true)
      setInstallPrompt(null)
    }
  }

  return <>
    <button className="pwa-install-button" type="button" aria-label={installed ? 'PaisaWise is installed' : 'Install PaisaWise'} disabled={installed} onClick={installApp}>
      {installed ? null : <Download size={18} strokeWidth={2} aria-hidden="true" />}
      <span>{installed ? 'Installed' : 'Install app'}</span>
    </button>
    {helpOpen && <div className="modal-backdrop" onClick={() => setHelpOpen(false)}>
      <section className="modal pwa-install-modal" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" onClick={event => event.stopPropagation()}>
        <div className="modal-head">
          <div><div className="eyebrow">PaisaWise on your phone</div><h2 id="pwa-install-title">Install PaisaWise</h2></div>
          <button type="button" className="close" aria-label="Close install instructions" onClick={() => setHelpOpen(false)}><X size={20} aria-hidden="true" /></button>
        </div>
        <p className="pwa-install-copy">{isIosDevice ? <>In Safari, tap <strong>Share</strong>, then choose <strong>Add to Home Screen</strong>.</> : <>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</>}</p>
        <button type="button" className="primary-btn" onClick={() => setHelpOpen(false)}>Got it</button>
      </section>
    </div>}
  </>
}
