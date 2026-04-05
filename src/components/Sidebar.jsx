import Icon from './Icons'

const s = {
  sidebar: {
    width: 220, background: '#131316',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', flexShrink: 0,
    zIndex: 99, transition: 'transform 0.2s',
  },
  sidebarHidden: {
    transform: 'translateX(-100%)',
    position: 'absolute', height: '100%',
  },
  logo: {
    padding: '24px 20px 20px',
    fontSize: 18, fontWeight: 700,
    letterSpacing: '-0.03em', color: '#e8e4df',
    userSelect: 'none',
  },
  navList: { flex: 1, padding: '0 8px', overflowY: 'auto' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    width: '100%', padding: '10px 12px',
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.45)', fontSize: 13,
    fontFamily: 'inherit', cursor: 'pointer',
    borderRadius: 8, transition: 'all 0.15s',
    textAlign: 'left', marginBottom: 2,
  },
  navActive: { background: 'rgba(255,255,255,0.07)', color: '#e8e4df' },
  badge: {
    marginLeft: 'auto', fontSize: 11,
    background: 'rgba(255,255,255,0.07)',
    padding: '2px 7px', borderRadius: 10,
    color: 'rgba(255,255,255,0.4)',
  },
  footer: { padding: '8px 8px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' },
  footerBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    width: '100%', padding: '9px 12px',
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.35)', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer',
    borderRadius: 8, transition: 'all 0.15s',
    textAlign: 'left',
  },
}

export default function Sidebar({
  view, counts, open,
  onNavigate, onBookmarklet, onSettings,
}) {
  const navItems = [
    { id: 'clips',  icon: 'clip',   label: 'Clips',  count: counts.clips  },
    { id: 'notes',  icon: 'note',   label: 'Notes',  count: counts.notes  },
    { id: 'essays', icon: 'essay',  label: 'Essays', count: counts.essays },
    { id: 'graph',  icon: 'graph',  label: 'Graph'                        },
    { id: 'chat',   icon: 'chat',   label: 'Ask AI'                       },
  ]

  return (
    <div
      className="sidebar"
      style={{ ...s.sidebar, ...(open ? {} : s.sidebarHidden) }}
    >
      <div style={s.logo}>◈ cortex</div>

      <nav style={s.navList}>
        {navItems.map(n => (
          <button
            key={n.id}
            className={`nav-item${view === n.id ? ' nav-active' : ''}`}
            style={{ ...s.navItem, ...(view === n.id ? s.navActive : {}) }}
            onClick={() => onNavigate(n.id)}
          >
            <Icon name={n.icon} size={16}/>
            <span>{n.label}</span>
            {n.count !== undefined && (
              <span style={s.badge}>{n.count}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={s.footer}>
        <button style={s.footerBtn} onClick={onBookmarklet}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          <Icon name="ext" size={14}/> Web Clipper
        </button>
        <button style={s.footerBtn} onClick={onSettings}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
        >
          <Icon name="settings" size={14}/> Settings
        </button>
      </div>
    </div>
  )
}
