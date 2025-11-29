import { Textarea } from '../../components/Textarea';
import { Label, Helper, Error } from '../../components/Input';

export default {
  title: 'Components/Textarea',
  component: Textarea,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Message</Label>
        <Textarea placeholder="Write your message here..." />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea placeholder="Describe your project..." rows={6} />
        <Helper>Maximum 500 characters.</Helper>
      </div>
    </div>
  ),
};

export const AutoGrow = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Auto-growing textarea</Label>
        <Textarea auto placeholder="Start typing... this textarea will grow automatically!" />
        <Helper>Uses CSS field-sizing: content</Helper>
      </div>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Normal</Label>
        <Textarea placeholder="Normal textarea" />
      </div>
      <div>
        <Label>Disabled</Label>
        <Textarea placeholder="Disabled textarea" disabled />
      </div>
      <div>
        <Label>Error</Label>
        <Textarea error placeholder="Error state" />
        <Error>Please enter a valid description.</Error>
      </div>
      <div>
        <Label>Success</Label>
        <Textarea success defaultValue="This is valid content." />
      </div>
    </div>
  ),
};
