import { Tooltip } from '../../components/Tooltip';
import { Button } from '../../components/Button';

export default {
  title: 'Components/Tooltip',
  component: Tooltip,
};

export const Positions = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-8 ig-p-8 ig-justify-center" style={{ marginTop: '4rem' }}>
      <Tooltip content="Tooltip on top" position="top">
        <Button variant="outline">Top</Button>
      </Tooltip>
      <Tooltip content="Tooltip on bottom" position="bottom">
        <Button variant="outline">Bottom</Button>
      </Tooltip>
      <Tooltip content="Tooltip on left" position="left">
        <Button variant="outline">Left</Button>
      </Tooltip>
      <Tooltip content="Tooltip on right" position="right">
        <Button variant="outline">Right</Button>
      </Tooltip>
    </div>
  ),
};

export const WithText = {
  render: () => (
    <div className="ig-p-8">
      <p>
        Hover over the{' '}
        <Tooltip content="This is a helpful tip!">
          <span className="ig-text-accent ig-cursor-pointer ig-underline">underlined text</span>
        </Tooltip>{' '}
        to see the tooltip.
      </p>
    </div>
  ),
};

export const WithIcons = {
  render: () => (
    <div className="ig-flex ig-gap-4 ig-p-8">
      <Tooltip content="Edit item">
        <Button icon variant="ghost">&#9998;</Button>
      </Tooltip>
      <Tooltip content="Delete item">
        <Button icon variant="ghost">&#128465;</Button>
      </Tooltip>
      <Tooltip content="Settings">
        <Button icon variant="ghost">&#9881;</Button>
      </Tooltip>
      <Tooltip content="More options">
        <Button icon variant="ghost">&#8942;</Button>
      </Tooltip>
    </div>
  ),
};

export const LongContent = {
  render: () => (
    <div className="ig-p-8">
      <Tooltip content="This is a longer tooltip message that provides more detailed information">
        <Button>Hover for details</Button>
      </Tooltip>
    </div>
  ),
};
