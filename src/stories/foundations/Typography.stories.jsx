export default {
  title: 'Foundations/Typography',
};

export const FontFamilies = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Font Families</h2>
      <p className="ig-text-muted ig-mb-6">Three font families for different purposes.</p>

      <div className="ig-flex ig-flex-col ig-gap-6">
        <div>
          <p className="ig-text-sm ig-text-muted ig-mb-2">Heading (Electrolize)</p>
          <p style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-3xl">
            The quick brown fox jumps
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-font-heading</code>
        </div>

        <div>
          <p className="ig-text-sm ig-text-muted ig-mb-2">Base (Saira)</p>
          <p style={{ fontFamily: 'var(--ig-font-base)' }} className="ig-text-xl">
            The quick brown fox jumps over the lazy dog
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-font-base</code>
        </div>

        <div>
          <p className="ig-text-sm ig-text-muted ig-mb-2">Mono (JetBrains Mono)</p>
          <p style={{ fontFamily: 'var(--ig-font-mono)' }} className="ig-text-lg">
            const greeting = "Hello, World!";
          </p>
          <code className="ig-text-xs ig-text-muted">--ig-font-mono</code>
        </div>
      </div>
    </div>
  ),
};

export const FontSizes = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Font Sizes</h2>
      <p className="ig-text-muted ig-mb-6">Type scale from xs to 5xl.</p>

      <div className="ig-flex ig-flex-col ig-gap-4">
        {[
          { class: 'ig-text-xs', label: 'Extra Small', size: '0.75rem' },
          { class: 'ig-text-sm', label: 'Small', size: '0.875rem' },
          { class: 'ig-text-base', label: 'Base', size: '1rem' },
          { class: 'ig-text-lg', label: 'Large', size: '1.125rem' },
          { class: 'ig-text-xl', label: 'XL', size: '1.25rem' },
          { class: 'ig-text-2xl', label: '2XL', size: '1.5rem' },
          { class: 'ig-text-3xl', label: '3XL', size: '1.875rem' },
          { class: 'ig-text-4xl', label: '4XL', size: '2.25rem' },
          { class: 'ig-text-5xl', label: '5XL', size: '3rem' },
        ].map(item => (
          <div key={item.class} className="ig-flex ig-items-baseline ig-gap-4">
            <span className={item.class}>The quick brown fox</span>
            <span className="ig-text-xs ig-text-muted">{item.label} ({item.size})</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const FontWeights = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Font Weights</h2>
      <p className="ig-text-muted ig-mb-6">Weight variants from light to bold.</p>

      <div className="ig-flex ig-flex-col ig-gap-4">
        {[
          { class: 'ig-fw-light', label: 'Light', weight: '300' },
          { class: 'ig-fw-normal', label: 'Normal', weight: '400' },
          { class: 'ig-fw-medium', label: 'Medium', weight: '500' },
          { class: 'ig-fw-semibold', label: 'Semibold', weight: '600' },
          { class: 'ig-fw-bold', label: 'Bold', weight: '700' },
        ].map(item => (
          <div key={item.class} className="ig-flex ig-items-center ig-gap-4">
            <span className={`ig-text-xl ${item.class}`} style={{ minWidth: '300px' }}>
              The quick brown fox
            </span>
            <span className="ig-text-sm ig-text-muted">{item.label} ({item.weight})</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const TextUtilities = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Text Utilities</h2>
      <p className="ig-text-muted ig-mb-6">Utility classes for text styling.</p>

      <div className="ig-flex ig-flex-col ig-gap-6">
        <div>
          <h3 className="ig-text-sm ig-fw-semibold ig-mb-2">Alignment</h3>
          <div className="ig-flex ig-flex-col ig-gap-2" style={{ maxWidth: '400px' }}>
            <p className="ig-text-left ig-p-2 ig-bg-muted ig-rounded">Left aligned (default)</p>
            <p className="ig-text-center ig-p-2 ig-bg-muted ig-rounded">Center aligned</p>
            <p className="ig-text-right ig-p-2 ig-bg-muted ig-rounded">Right aligned</p>
          </div>
        </div>

        <div>
          <h3 className="ig-text-sm ig-fw-semibold ig-mb-2">Transform</h3>
          <div className="ig-flex ig-flex-col ig-gap-2">
            <p className="ig-uppercase">Uppercase text</p>
            <p className="ig-lowercase">LOWERCASE TEXT</p>
            <p className="ig-capitalize">capitalize each word</p>
          </div>
        </div>

        <div>
          <h3 className="ig-text-sm ig-fw-semibold ig-mb-2">Decoration</h3>
          <div className="ig-flex ig-gap-4">
            <p className="ig-underline">Underline</p>
            <p className="ig-line-through">Line through</p>
            <p className="ig-no-underline">No underline</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

export const HeadingStyles = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Heading Styles</h2>
      <p className="ig-text-muted ig-mb-6">Recommended heading hierarchy.</p>

      <div className="ig-flex ig-flex-col ig-gap-4">
        <div>
          <h1 style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-5xl ig-fw-bold">
            Heading 1
          </h1>
          <code className="ig-text-xs ig-text-muted">5xl + bold + heading font</code>
        </div>
        <div>
          <h2 style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-4xl ig-fw-bold">
            Heading 2
          </h2>
          <code className="ig-text-xs ig-text-muted">4xl + bold + heading font</code>
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--ig-font-heading)' }} className="ig-text-3xl ig-fw-semibold">
            Heading 3
          </h3>
          <code className="ig-text-xs ig-text-muted">3xl + semibold + heading font</code>
        </div>
        <div>
          <h4 className="ig-text-2xl ig-fw-semibold">Heading 4</h4>
          <code className="ig-text-xs ig-text-muted">2xl + semibold</code>
        </div>
        <div>
          <h5 className="ig-text-xl ig-fw-semibold">Heading 5</h5>
          <code className="ig-text-xs ig-text-muted">xl + semibold</code>
        </div>
        <div>
          <h6 className="ig-text-lg ig-fw-medium">Heading 6</h6>
          <code className="ig-text-xs ig-text-muted">lg + medium</code>
        </div>
      </div>
    </div>
  ),
};
