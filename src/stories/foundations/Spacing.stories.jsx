export default {
  title: 'Foundations/Spacing',
};

const SpacingBox = ({ size, value }) => (
  <div className="ig-flex ig-items-center ig-gap-4 ig-mb-2">
    <div
      style={{
        width: value,
        height: '2rem',
        backgroundColor: 'var(--ig-accent)',
        borderRadius: 'var(--ig-rounded)',
      }}
    />
    <span className="ig-text-sm" style={{ minWidth: '80px' }}>space-{size}</span>
    <code className="ig-text-xs ig-text-muted">{value}</code>
  </div>
);

export const SpacingScale = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Spacing Scale</h2>
      <p className="ig-text-muted ig-mb-6">Consistent spacing values based on 0.25rem (4px) unit.</p>

      <div className="ig-flex ig-flex-col ig-gap-1">
        <SpacingBox size="0" value="0" />
        <SpacingBox size="0.5" value="0.125rem" />
        <SpacingBox size="1" value="0.25rem" />
        <SpacingBox size="1.5" value="0.375rem" />
        <SpacingBox size="2" value="0.5rem" />
        <SpacingBox size="2.5" value="0.625rem" />
        <SpacingBox size="3" value="0.75rem" />
        <SpacingBox size="3.5" value="0.875rem" />
        <SpacingBox size="4" value="1rem" />
        <SpacingBox size="5" value="1.25rem" />
        <SpacingBox size="6" value="1.5rem" />
        <SpacingBox size="7" value="1.75rem" />
        <SpacingBox size="8" value="2rem" />
        <SpacingBox size="9" value="2.25rem" />
        <SpacingBox size="10" value="2.5rem" />
        <SpacingBox size="12" value="3rem" />
        <SpacingBox size="14" value="3.5rem" />
        <SpacingBox size="16" value="4rem" />
        <SpacingBox size="20" value="5rem" />
        <SpacingBox size="24" value="6rem" />
      </div>
    </div>
  ),
};

export const PaddingExamples = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Padding Classes</h2>
      <p className="ig-text-muted ig-mb-6">Use ig-p-* for padding on all sides.</p>

      <div className="ig-flex ig-flex-wrap ig-gap-4">
        {[0, 1, 2, 3, 4, 6, 8].map(size => (
          <div key={size} className="ig-flex ig-flex-col ig-items-center">
            <div
              className={`ig-p-${size} ig-bg-accent`}
              style={{ borderRadius: 'var(--ig-rounded-md)' }}
            >
              <div className="ig-bg-surface ig-p-2 ig-rounded ig-text-xs">
                Content
              </div>
            </div>
            <span className="ig-text-xs ig-text-muted ig-mt-2">ig-p-{size}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const MarginExamples = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Margin Classes</h2>
      <p className="ig-text-muted ig-mb-6">Use ig-m-* for margin on all sides.</p>

      <div className="ig-flex ig-flex-col ig-gap-4" style={{ maxWidth: '400px' }}>
        {[0, 2, 4, 6, 8].map(size => (
          <div key={size} className="ig-bg-muted ig-p-2 ig-rounded">
            <div
              className={`ig-m-${size} ig-bg-accent ig-p-4 ig-rounded ig-text-center`}
              style={{ color: 'var(--ig-text-on-accent)' }}
            >
              ig-m-{size}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const GapExamples = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Gap Classes</h2>
      <p className="ig-text-muted ig-mb-6">Use ig-gap-* for flexbox/grid gaps.</p>

      <div className="ig-flex ig-flex-col ig-gap-6">
        {[1, 2, 3, 4, 6, 8].map(size => (
          <div key={size}>
            <p className="ig-text-sm ig-text-muted ig-mb-2">ig-gap-{size}</p>
            <div className={`ig-flex ig-gap-${size}`}>
              {[1, 2, 3, 4, 5].map(i => (
                <div
                  key={i}
                  className="ig-bg-accent ig-p-3 ig-rounded"
                  style={{ color: 'var(--ig-text-on-accent)' }}
                >
                  {i}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

export const DirectionalSpacing = {
  render: () => (
    <div className="ig-p-4">
      <h2 className="ig-text-xl ig-fw-bold ig-mb-4">Directional Spacing</h2>
      <p className="ig-text-muted ig-mb-6">Use suffixes for specific directions.</p>

      <div className="ig-grid ig-grid-cols-2 ig-gap-4" style={{ maxWidth: '600px' }}>
        <div className="ig-p-4 ig-bg-muted ig-rounded">
          <p className="ig-text-sm ig-fw-medium ig-mb-2">Padding</p>
          <ul className="ig-text-xs ig-flex ig-flex-col ig-gap-1">
            <li><code>ig-pt-*</code> - padding-top</li>
            <li><code>ig-pr-*</code> - padding-right</li>
            <li><code>ig-pb-*</code> - padding-bottom</li>
            <li><code>ig-pl-*</code> - padding-left</li>
            <li><code>ig-px-*</code> - padding left+right</li>
            <li><code>ig-py-*</code> - padding top+bottom</li>
          </ul>
        </div>

        <div className="ig-p-4 ig-bg-muted ig-rounded">
          <p className="ig-text-sm ig-fw-medium ig-mb-2">Margin</p>
          <ul className="ig-text-xs ig-flex ig-flex-col ig-gap-1">
            <li><code>ig-mt-*</code> - margin-top</li>
            <li><code>ig-mr-*</code> - margin-right</li>
            <li><code>ig-mb-*</code> - margin-bottom</li>
            <li><code>ig-ml-*</code> - margin-left</li>
            <li><code>ig-mx-*</code> - margin left+right</li>
            <li><code>ig-my-*</code> - margin top+bottom</li>
          </ul>
        </div>
      </div>
    </div>
  ),
};
