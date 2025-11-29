export default {
  title: 'Foundations/Colors',
};

const ColorBox = ({ color, name, textColor = 'white' }) => (
  <div
    style={{
      backgroundColor: `var(--ig-${color})`,
      color: textColor,
      padding: '1rem',
      borderRadius: 'var(--ig-rounded-md)',
      textAlign: 'center',
      minWidth: '120px',
    }}
  >
    <div className="ig-fw-medium">{name}</div>
    <div className="ig-text-xs ig-opacity-80">--ig-{color}</div>
  </div>
);

export const CardinalColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Cardinal Colors</h2>
      <p className="ig-text-muted ig-mb-6">The four signature colors of Igoded Design System.</p>
      <div className="ig-flex ig-flex-wrap ig-gap-4">
        <ColorBox color="tellus" name="Tellus" />
        <ColorBox color="liminal" name="Liminal" />
        <ColorBox color="senum" name="Senum" textColor="var(--ig-neutral-900)" />
        <ColorBox color="vesper" name="Vesper" />
      </div>
    </div>
  ),
};

export const ThemeColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Theme Colors</h2>
      <p className="ig-text-muted ig-mb-6">Adaptive colors that change based on light/dark theme.</p>
      <div className="ig-flex ig-flex-wrap ig-gap-4">
        <ColorBox color="primary" name="Primary" />
        <ColorBox color="accent" name="Accent" />
      </div>
    </div>
  ),
};

export const SemanticColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Semantic Colors</h2>
      <p className="ig-text-muted ig-mb-6">Colors for communicating status and feedback.</p>
      <div className="ig-flex ig-flex-wrap ig-gap-4">
        <ColorBox color="success" name="Success" />
        <ColorBox color="warning" name="Warning" textColor="var(--ig-neutral-900)" />
        <ColorBox color="danger" name="Danger" />
        <ColorBox color="info" name="Info" />
      </div>
    </div>
  ),
};

export const NeutralScale = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Neutral Scale</h2>
      <p className="ig-text-muted ig-mb-6">Gray scale for backgrounds, borders, and text.</p>
      <div className="ig-flex ig-flex-col ig-gap-2">
        {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map(shade => (
          <div
            key={shade}
            style={{
              backgroundColor: `var(--ig-neutral-${shade})`,
              color: shade >= 500 ? 'white' : 'var(--ig-neutral-900)',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--ig-rounded-md)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span className="ig-fw-medium">Neutral {shade}</span>
            <span className="ig-text-sm ig-opacity-80">--ig-neutral-{shade}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const BackgroundColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Background Colors</h2>
      <p className="ig-text-muted ig-mb-6">Background variants for different contexts.</p>
      <div className="ig-flex ig-flex-col ig-gap-3">
        {[
          { var: 'bg-base', label: 'Base' },
          { var: 'bg-surface', label: 'Surface' },
          { var: 'bg-muted', label: 'Muted' },
          { var: 'bg-elevated', label: 'Elevated' },
        ].map(bg => (
          <div
            key={bg.var}
            style={{
              backgroundColor: `var(--ig-${bg.var})`,
              padding: '1.5rem',
              borderRadius: 'var(--ig-rounded-lg)',
              border: '1px solid var(--ig-border-subtle)',
            }}
          >
            <div className="ig-fw-medium">{bg.label}</div>
            <div className="ig-text-sm ig-text-muted">--ig-{bg.var}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const TextColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Text Colors</h2>
      <p className="ig-text-muted ig-mb-6">Text color variants for hierarchy.</p>
      <div className="ig-flex ig-flex-col ig-gap-4">
        <div>
          <p style={{ color: 'var(--ig-text-heading)' }} className="ig-text-lg ig-fw-semibold">
            Heading Text
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-text-heading</code>
        </div>
        <div>
          <p style={{ color: 'var(--ig-text-body)' }}>
            Body Text - Default text color for paragraphs and content.
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-text-body</code>
        </div>
        <div>
          <p style={{ color: 'var(--ig-text-muted)' }}>
            Muted Text - Secondary text, captions, and helper text.
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-text-muted</code>
        </div>
        <div>
          <p style={{ color: 'var(--ig-text-disabled)' }}>
            Disabled Text - Text for disabled elements.
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-text-disabled</code>
        </div>
      </div>
    </div>
  ),
};

export const BorderColors = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Border Colors</h2>
      <p className="ig-text-muted ig-mb-6">Border variants for different emphasis levels.</p>
      <div className="ig-flex ig-flex-col ig-gap-4">
        {[
          { var: 'border-subtle', label: 'Subtle' },
          { var: 'border-default', label: 'Default' },
          { var: 'border-strong', label: 'Strong' },
        ].map(border => (
          <div
            key={border.var}
            style={{
              padding: '1rem',
              borderRadius: 'var(--ig-rounded-lg)',
              border: `2px solid var(--ig-${border.var})`,
            }}
          >
            <div className="ig-fw-medium">{border.label}</div>
            <div className="ig-text-sm ig-text-muted">--ig-{border.var}</div>
          </div>
        ))}
      </div>
    </div>
  ),
};
