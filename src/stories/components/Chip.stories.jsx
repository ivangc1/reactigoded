import { useState } from 'react';
import { Chip } from '../../components/Chip';

export default {
  title: 'Components/Chip',
  component: Chip,
};

export const Basic = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-2 ig-p-4">
      <Chip>JavaScript</Chip>
      <Chip>React</Chip>
      <Chip>TypeScript</Chip>
      <Chip>CSS</Chip>
      <Chip>HTML</Chip>
    </div>
  ),
};

export const Variants = {
  render: () => (
    <div className="ig-flex ig-flex-wrap ig-gap-2 ig-p-4">
      <Chip>Default</Chip>
      <Chip variant="primary">Primary</Chip>
      <Chip variant="success">Success</Chip>
      <Chip variant="warning">Warning</Chip>
      <Chip variant="danger">Danger</Chip>
    </div>
  ),
};

export const Sizes = {
  render: () => (
    <div className="ig-flex ig-items-center ig-gap-2 ig-p-4">
      <Chip size="sm">Small</Chip>
      <Chip>Default</Chip>
      <Chip size="lg">Large</Chip>
    </div>
  ),
};

export const Removable = {
  render: function RemovableChips() {
    const [chips, setChips] = useState(['JavaScript', 'React', 'TypeScript', 'CSS', 'HTML']);

    return (
      <div className="ig-p-4">
        <div className="ig-flex ig-flex-wrap ig-gap-2">
          {chips.map(chip => (
            <Chip key={chip} onRemove={() => setChips(c => c.filter(x => x !== chip))}>
              {chip}
            </Chip>
          ))}
        </div>
        {chips.length === 0 && (
          <p className="ig-text-muted ig-mt-2">All chips removed.</p>
        )}
      </div>
    );
  },
};

export const Selectable = {
  render: function SelectableChips() {
    const [selected, setSelected] = useState(['React']);
    const options = ['React', 'Vue', 'Angular', 'Svelte', 'Solid'];

    const toggle = (option) => {
      setSelected(s =>
        s.includes(option) ? s.filter(x => x !== option) : [...s, option]
      );
    };

    return (
      <div className="ig-p-4">
        <p className="ig-text-sm ig-mb-3">Select your preferred frameworks:</p>
        <div className="ig-flex ig-flex-wrap ig-gap-2">
          {options.map(option => (
            <Chip
              key={option}
              selectable
              selected={selected.includes(option)}
              onClick={() => toggle(option)}
            >
              {option}
            </Chip>
          ))}
        </div>
        <p className="ig-text-sm ig-text-muted ig-mt-3">
          Selected: {selected.join(', ') || 'None'}
        </p>
      </div>
    );
  },
};

export const TagInput = {
  render: function TagInput() {
    const [tags, setTags] = useState(['design', 'ui', 'frontend']);
    const [input, setInput] = useState('');

    const addTag = (e) => {
      if (e.key === 'Enter' && input.trim()) {
        setTags([...tags, input.trim()]);
        setInput('');
      }
    };

    return (
      <div className="ig-p-4 ig-max-w-md">
        <label className="ig-label">Tags</label>
        <div className="ig-flex ig-flex-wrap ig-gap-2 ig-p-2 ig-border ig-border-subtle ig-rounded-md">
          {tags.map(tag => (
            <Chip key={tag} size="sm" onRemove={() => setTags(t => t.filter(x => x !== tag))}>
              {tag}
            </Chip>
          ))}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={addTag}
            placeholder="Add tag..."
            className="ig-flex-1 ig-min-w-20 ig-border-0 ig-outline-none ig-bg-transparent ig-text-sm"
            style={{ minWidth: '80px' }}
          />
        </div>
        <p className="ig-helper">Press Enter to add a tag</p>
      </div>
    );
  },
};
