import { Link, useNavigate } from 'react-router-dom'
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit'
import { useState, useEffect } from 'react'
import logoImg from '../../assets/IWAS-logo-transparent.png'

export default function Nav() {
  const account = useCurrentAccount()
  const navigate = useNavigate()
  const { mutate: disconnect } = useDisconnectWallet()
  const [modalOpen, setModalOpen] = useState(false)

  // Determine wallet address display
  const shortAddr = account ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : ''
  const mobileAddr = account ? `${account.address.slice(0, 4)}...${account.address.slice(-4)}` : ''

  return (
    <nav className="iwas-nav">
      <Link to="/" className="iwas-nav-logo" style={{ display: 'flex', alignItems: 'center' }}>
        <img
          src={logoImg}
          alt="i was."
          draggable="false"
          style={{ height: 96, width: 'auto', display: 'block', userSelect: 'none', pointerEvents: 'none' }}
        />
      </Link>
      <div className="iwas-nav-right">
        {account && (
          <button
            className="btn-ghost my-marks-btn"
            onClick={() => navigate('/me')}
            style={{ fontSize: 11, letterSpacing: '0.08em' }}
          >
            my marks
          </button>
        )}

        {account ? (
          <button
            className="btn-ghost addr-btn"
            onClick={() => disconnect()}
            title="Click to disconnect"
            style={{ fontSize: 11, letterSpacing: '0.08em' }}
          >
            <span className="desktop-addr">{shortAddr}</span>
            <span className="mobile-addr">{mobileAddr}</span>
          </button>
        ) : (
          <ConnectModal
            open={modalOpen}
            onOpenChange={setModalOpen}
            trigger={
              <button
                className="btn-ghost"
                onClick={() => setModalOpen(true)}
                style={{ fontSize: 11, letterSpacing: '0.08em' }}
              >
                connect
              </button>
            }
          />
        )}
      </div>
    </nav>
  )
}
