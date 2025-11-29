import { Button } from '../../components/Button';

export default {
  title: 'Components/Button',
  component: Button,
};

export const AllVariants = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-4 ig-p-4">
      <Button variant="primary">Primary</Button>
      <Button variant="accent">Accent</Button>
      <Button variant="tellus">Tellus</Button>
      <Button variant="liminal">Liminal</Button>
      <Button variant="senum">Senum</Button>
      <Button variant="vesper">Vesper</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-4 ig-p-4">
      <Button size="xs">Extra Small</Button>
      <Button size="sm">Small</Button>
      <Button>Default</Button>
      <Button size="lg">Large</Button>
      <Button size="xl">Extra Large</Button>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-4">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
};

export const LoadingStates = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-4 ig-p-4">
      <Button variant="primary" loading>Primary</Button>
      <Button variant="accent" loading>Accent</Button>
      <Button variant="tellus" loading>Tellus</Button>
      <Button variant="outline" loading>Outline</Button>
      <Button variant="ghost" loading>Ghost</Button>
      <Button variant="success" loading>Success</Button>
      <Button variant="danger" loading>Danger</Button>
    </div>
  ),
};

export const Modifiers = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4">
      <Button block>Block (Full Width)</Button>
      <div className="ig-flex ig-gap-2">
        <Button icon>+</Button>
        <Button icon variant="accent">&#x2715;</Button>
        <Button icon variant="outline">&#9881;</Button>
        <Button icon variant="ghost">&#9776;</Button>
      </div>
      <div className="ig-flex ig-gap-2">
        <Button icon size="sm">+</Button>
        <Button icon>+</Button>
        <Button icon size="lg">+</Button>
      </div>
    </div>
  ),
};

export const WithIcons = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-4 ig-p-4">
      <Button variant="primary">
        <span>&#x2795;</span> Add Item
      </Button>
      <Button variant="success">
        <span>&#10003;</span> Confirm
      </Button>
      <Button variant="danger">
        Delete <span>&#128465;</span>
      </Button>
      <Button variant="outline">
        <span>&#x21bb;</span> Refresh
      </Button>
    </div>
  ),
};
