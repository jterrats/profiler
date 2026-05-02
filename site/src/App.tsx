const badges = ['npm package', 'EDD CI', 'MIT license', 'Node 18+']

const benefits = [
  {
    title: 'Safe by Design',
    body: 'Retrieval runs in an isolated temporary Salesforce project, then copies only Profile metadata back into your workspace.',
  },
  {
    title: 'Profile-Focused',
    body: 'Built for legacy orgs where Profiles still carry operational risk during a longer Permission Set migration.',
  },
  {
    title: 'Error-First',
    body: 'Operational failures are modeled explicitly so commands can produce useful, reviewable outcomes instead of vague crashes.',
  },
  {
    title: 'Review Ready',
    body: 'Compare local and org profile state, generate documentation, and keep release evidence easier to inspect.',
  },
]

const commands = [
  {
    title: 'Retrieve Profiles',
    command: 'sf profiler retrieve --target-org myOrg --name Admin --all-fields',
    body: 'Pull complete Profile metadata safely, with options for local metadata, managed-package filtering, and focused retrieval.',
  },
  {
    title: 'Compare State',
    command: 'sf profiler compare --target-org myOrg --name "Admin"',
    body: 'Diff local and org Profile metadata before deciding what should move through review and deployment.',
  },
  {
    title: 'Generate Docs',
    command: 'sf profiler docs --name Admin --output-dir docs/profiles',
    body: 'Create readable Profile documentation for handoff, audit, and migration planning.',
  },
]

const guarantees = [
  'Only Profile metadata is copied back to the working project.',
  'Apex, objects, flows, layouts, and pages are not overwritten by retrieve.',
  'Temporary retrieval directories isolate Salesforce CLI side effects.',
  'Comparison and docs commands are designed for reviewable release evidence.',
]

export default function App() {
  return (
    <main className="app-shell">
      <nav className="topbar" aria-label="Primary navigation">
        <a className="brand" href="/">
          profiler
        </a>
        <div className="nav-links">
          <a href="https://jterrats.dev">Main site</a>
          <a href="#commands">Commands</a>
          <a href="#safety">Safety</a>
          <a href="#docs">Docs</a>
          <a href="https://github.com/jterrats/profiler" target="_blank" rel="noreferrer">
            GitHub
          </a>
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">Salesforce CLI plugin</p>
        <h1>Safe Profile metadata workflows for legacy Salesforce orgs.</h1>
        <p className="hero-copy">
          Profiler retrieves, compares, and documents Salesforce Profile metadata with an
          error-first workflow designed for high-debt environments where Profiles still matter.
        </p>
        <div className="actions">
          <a className="button button-primary" href="#commands">
            View commands
          </a>
          <a
            className="button button-secondary"
            href="https://www.npmjs.com/package/@jterrats/profiler"
            target="_blank"
            rel="noreferrer"
          >
            npm package
          </a>
        </div>
        <ul className="badge-list" aria-label="Project metadata">
          {badges.map((badge) => (
            <li key={badge}>{badge}</li>
          ))}
        </ul>
      </section>

      <section className="section-grid" aria-labelledby="why-title">
        <div className="section-heading">
          <p className="eyebrow">Why it exists</p>
          <h2 id="why-title">Profile-heavy orgs need safer operations.</h2>
        </div>
        <div className="card-grid">
          {benefits.map(({ title, body }) => (
            <article className="card" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-grid" id="commands" aria-labelledby="commands-title">
        <div className="section-heading">
          <p className="eyebrow">Command surface</p>
          <h2 id="commands-title">Focused commands for retrieval, comparison, and evidence.</h2>
        </div>
        <div className="command-list">
          {commands.map(({ title, command, body }) => (
            <article className="command-card" key={title}>
              <div>
                <h3>{title}</h3>
                <p>{body}</p>
              </div>
              <pre>
                <code>{command}</code>
              </pre>
            </article>
          ))}
        </div>
      </section>

      <section className="section-grid" id="safety" aria-labelledby="safety-title">
        <div className="section-heading">
          <p className="eyebrow">Safety model</p>
          <h2 id="safety-title">Conservative by default.</h2>
        </div>
        <div className="safety-panel">
          <ul>
            {guarantees.map((guarantee) => (
              <li key={guarantee}>{guarantee}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="cta" id="docs">
        <div className="cta-heading">
          <p className="eyebrow">Documentation</p>
          <h2>Existing docs stay available during the migration.</h2>
        </div>
        <div className="cta-card">
          <p>
            This pilot keeps the public product page focused and gives us a clean base for
            migrating the detailed command guides next.
          </p>
          <div className="actions">
            <a
              className="button button-primary"
              href="https://github.com/jterrats/profiler/tree/main/docs"
              target="_blank"
              rel="noreferrer"
            >
              Browse docs
            </a>
            <a
              className="button button-secondary"
              href="https://github.com/jterrats/profiler/releases"
              target="_blank"
              rel="noreferrer"
            >
              Releases
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
