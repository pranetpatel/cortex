import React from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App'

class ErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          color: '#ff5555', padding: 40,
          fontFamily: 'monospace', background: '#0e0e11',
          height: '100vh', boxSizing: 'border-box',
        }}>
          <div style={{ color: '#f59e42', fontSize: 18, marginBottom: 16 }}>
            ◈ cortex — startup error
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.6 }}>
            {this.state.error.message}{'\n\n'}{this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
