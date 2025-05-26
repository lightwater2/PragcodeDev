import { Link } from 'react-router-dom'
import { Code2, Sparkles, Zap, Github, ArrowRight } from 'lucide-react'
import './Landing.css'

function Landing() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo">
            <Code2 size={28} />
            <span>PragcodeDev</span>
          </div>
          <div className="nav-links">
            <a href="https://github.com/lightwater2/PragcodeDev" target="_blank" rel="noopener noreferrer">
              <Github size={20} />
            </a>
            <Link to="/login" className="cta-button">
              Start Coding
            </Link>
          </div>
        </div>
      </nav>

      <main className="landing-main">
        <section className="hero">
          <div className="hero-content">
            <h1 className="hero-title">
              Code with AI
              <span className="gradient-text"> Assistance</span>
            </h1>
            <p className="hero-subtitle">
              Experience the future of web development with our AI-powered React IDE.
              Write, test, and deploy React applications directly in your browser.
            </p>
            <div className="hero-actions">
              <Link to="/login" className="primary-button">
                Launch IDE
                <ArrowRight size={18} />
              </Link>
              <a href="#features" className="secondary-button">
                Learn More
              </a>
            </div>
          </div>
          <div className="hero-visual">
            <div className="code-preview">
              <div className="code-header">
                <div className="code-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
              <pre className="code-content">
                <code>{`function App() {
  const [count, setCount] = useState(0)
  
  return (
    <div className="app">
      <h1>Hello React!</h1>
      <button onClick={() => setCount(count + 1)}>
        Count: {count}
      </button>
    </div>
  )
}`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section id="features" className="features">
          <div className="features-container">
            <h2 className="features-title">Powerful Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">
                  <Sparkles />
                </div>
                <h3>AI Code Assistant</h3>
                <p>Get intelligent code suggestions and explanations powered by Claude AI</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Zap />
                </div>
                <h3>Instant Preview</h3>
                <p>See your React components come to life with real-time hot reloading</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">
                  <Code2 />
                </div>
                <h3>Full IDE Experience</h3>
                <p>Monaco Editor with syntax highlighting, IntelliSense, and multi-file support</p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-container">
            <h2>Ready to start coding?</h2>
            <p>No installation required. Start building React applications right now.</p>
            <Link to="/login" className="cta-button-large">
              Open IDE
              <ArrowRight size={20} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <p>&copy; 2024 PragcodeDev. Built with React and ❤️</p>
      </footer>
    </div>
  )
}

export default Landing