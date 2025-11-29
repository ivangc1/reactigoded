import { Card, CardHeader, CardBody, CardFooter } from '../../components/Card';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Card',
  component: Card,
};

export const Basic = {
  render: () => (
    <div className="ig-p-4 ig-max-w-md">
      <Card>
        <CardHeader>Card Title</CardHeader>
        <CardBody>
          <p>This is a basic card with header, body, and footer sections.</p>
        </CardBody>
        <CardFooter>
          <Button variant="primary" size="sm">Action</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-4 ig-p-4">
      <Card style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Default Card</h4>
          <p className="ig-text-sm ig-text-muted">Basic card with border.</p>
        </CardBody>
      </Card>

      <Card variant="bordered" style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Bordered Card</h4>
          <p className="ig-text-sm ig-text-muted">Explicit bordered variant.</p>
        </CardBody>
      </Card>

      <Card variant="elevated" style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Elevated Card</h4>
          <p className="ig-text-sm ig-text-muted">Card with shadow instead of border.</p>
        </CardBody>
      </Card>

      <Card variant="glass" style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Glass Card</h4>
          <p className="ig-text-sm ig-text-muted">Glassmorphism effect.</p>
        </CardBody>
      </Card>
    </div>
  ),
};

export const Interactive = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <Card interactive style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Interactive Card</h4>
          <p className="ig-text-sm ig-text-muted">Hover to see the effect.</p>
        </CardBody>
      </Card>

      <Card interactive variant="elevated" style={{ width: '280px' }}>
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Elevated Interactive</h4>
          <p className="ig-text-sm ig-text-muted">Click or hover for interaction.</p>
        </CardBody>
      </Card>
    </div>
  ),
};

export const WithImage = {
  render: () => (
    <div className="ig-p-4 ig-max-w-sm">
      <Card>
        <div className="ig-card-image ig-card-image-top" style={{ height: '200px', background: 'linear-gradient(135deg, var(--ig-tellus), var(--ig-liminal))' }} />
        <CardBody>
          <h4 className="ig-fw-semibold ig-mb-2">Card with Image</h4>
          <p className="ig-text-sm ig-text-muted">
            Beautiful gradient placeholder representing an image area.
          </p>
        </CardBody>
        <CardFooter>
          <Button variant="outline" size="sm">Learn More</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const CompleteExample = {
  render: () => (
    <div className="ig-grid ig-grid-cols-3 ig-gap-4 ig-p-4" style={{ maxWidth: '900px' }}>
      {['Tellus', 'Liminal', 'Senum'].map((name, i) => (
        <Card key={name} variant="elevated">
          <div style={{
            height: '120px',
            background: `var(--ig-${name.toLowerCase()})`,
            borderRadius: 'var(--ig-rounded-lg) var(--ig-rounded-lg) 0 0'
          }} />
          <CardBody>
            <h4 className="ig-fw-semibold">{name} Plan</h4>
            <p className="ig-text-sm ig-text-muted ig-mt-1">Perfect for {['small teams', 'growing businesses', 'enterprises'][i]}.</p>
            <p className="ig-text-2xl ig-fw-bold ig-mt-3">${[9, 29, 99][i]}<span className="ig-text-sm ig-fw-normal ig-text-muted">/mo</span></p>
          </CardBody>
          <CardFooter>
            <Button variant="primary" block>Choose Plan</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  ),
};
