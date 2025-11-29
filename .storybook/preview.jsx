import '../src/styles/igoded-design.css';
import { ThemeSwitch } from '../src/components/ThemeSwitch';

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: { disable: true },
  },

  decorators: [
    (Story) => (
      <div style={{ padding: '1rem' }}>
        <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <ThemeSwitch />
        </div>
        <Story />
      </div>
    ),
  ],
};

export default preview;
