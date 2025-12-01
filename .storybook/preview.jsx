import '../src/styles/igoded-design.css';

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
    layout: 'padded',
  },

  globalTypes: {
    theme: {
      name: 'Tema',
      description: 'Cambiar entre modo claro y oscuro',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', icon: 'sun', title: 'Claro' },
          { value: 'dark', icon: 'moon', title: 'Oscuro' },
        ],
        showName: true,
      },
    },
  },

  decorators: [
    (Story, context) => {
      const theme = context.globals.theme;
      document.documentElement.setAttribute('data-theme', theme);
      return (
        <div style={{
          background: 'var(--ig-bg-base)',
          color: 'var(--ig-text-body)',
          minHeight: '100vh',
          padding: '1rem'
        }}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
