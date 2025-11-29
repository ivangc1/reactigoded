import { Select } from '../../components/Select';
import { Label, Helper, Error } from '../../components/Input';

export default {
  title: 'Components/Select',
  component: Select,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Country</Label>
        <Select>
          <option value="">Select a country</option>
          <option value="es">Spain</option>
          <option value="fr">France</option>
          <option value="de">Germany</option>
          <option value="it">Italy</option>
          <option value="uk">United Kingdom</option>
        </Select>
      </div>
      <div>
        <Label>Category</Label>
        <Select defaultValue="tech">
          <option value="tech">Technology</option>
          <option value="design">Design</option>
          <option value="business">Business</option>
          <option value="marketing">Marketing</option>
        </Select>
        <Helper>Choose the main category for your project.</Helper>
      </div>
    </div>
  ),
};

export const States = {
  render: () => (
    <div className="ig-flex ig-flex-col ig-gap-4 ig-p-4 ig-max-w-md">
      <div>
        <Label>Normal</Label>
        <Select>
          <option>Option 1</option>
          <option>Option 2</option>
          <option>Option 3</option>
        </Select>
      </div>
      <div>
        <Label>Disabled</Label>
        <Select disabled>
          <option>Disabled select</option>
        </Select>
      </div>
      <div>
        <Label>Error</Label>
        <Select error>
          <option value="">Please select an option</option>
          <option>Option 1</option>
        </Select>
        <Error>This field is required.</Error>
      </div>
      <div>
        <Label>Success</Label>
        <Select success defaultValue="valid">
          <option value="valid">Valid selection</option>
        </Select>
      </div>
    </div>
  ),
};
