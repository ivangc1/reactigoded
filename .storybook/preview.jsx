import '../src/styles/igoded-design.css'

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f1414' },
        { name: 'light', value: '#e8eef4' },
      ],
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'dark',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['dark', 'light'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme || 'dark'
      return (
        <div data-theme={theme} style={{ padding: '2rem', minHeight: '100vh' }}>
          <Story />
        </div>
      )
    },
  ],
}

export default preview
