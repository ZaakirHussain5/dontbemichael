import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { formatWorkStyleDraft, parseWorkStyleDraft, type WorkStyleDraft } from '@shared/agentProfile';
import { useRtl } from '@/i18n/useDirection';
import { Icon } from './Icon';
import { PixelButton } from './PixelButton';

/**
 * The work style as a list (Edit agent): the job is one note, and each duty
 * or approval is its own line. Saving still hands the plain labels to the
 * rewrite, so the agent receives the same instructions as before.
 */
export function WorkStyleList({ value, onChange, invalid }: {
  value: string;
  onChange: (next: string) => void;
  invalid?: boolean;
}) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const [draft, setDraft] = useState(() => parseWorkStyleDraft(value));

  // A rewrite arriving from outside replaces the list. Typing does not: the
  // parent stores the formatted text, which parses back to these same lines.
  useEffect(() => {
    setDraft((cur) => (formatWorkStyleDraft(cur) === value ? cur : parseWorkStyleDraft(value)));
  }, [value]);

  const edit = (next: WorkStyleDraft): void => {
    setDraft(next);
    onChange(formatWorkStyleDraft(next));
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 14, flex: 1, minHeight: 320, overflowY: 'auto',
      padding: '10px 10px 12px', borderRadius: 'var(--cth-r-md)', background: 'var(--cth-paper-100)',
      boxShadow: invalid ? 'inset 0 0 0 1.5px var(--cth-coral)' : 'inset 0 0 0 1px var(--cth-line-2)'
    }}>
      <Part label={t('editAgent.jobLabel')}>
        <textarea
          dir={rtl ? 'auto' : undefined}
          value={draft.job}
          rows={3}
          placeholder={t('editAgent.jobPlaceholder')}
          aria-label={t('editAgent.jobLabel')}
          className="cth-input"
          onChange={(e) => edit({ ...draft, job: e.target.value })}
          style={fieldStyle}
        />
      </Part>
      <DutyList
        label={t('editAgent.doesLabel')}
        placeholder={t('editAgent.linePlaceholder')}
        addLabel={t('editAgent.addLine')}
        removeLabel={t('editAgent.removeLine')}
        items={draft.does}
        onChange={(does) => edit({ ...draft, does })}
      />
      <DutyList
        label={t('editAgent.asksLabel')}
        placeholder={t('editAgent.askPlaceholder')}
        addLabel={t('editAgent.addLine')}
        removeLabel={t('editAgent.removeLine')}
        items={draft.asksFirst}
        onChange={(asksFirst) => edit({ ...draft, asksFirst })}
      />
    </div>
  );
}

function DutyList({ label, placeholder, addLabel, removeLabel, items, onChange }: {
  label: string;
  placeholder: string;
  addLabel: string;
  removeLabel: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const rtl = useRtl();
  const setAt = (i: number, text: string) => onChange(items.map((line, j) => (j === i ? text : line)));
  return (
    <Part label={label}>
      {items.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((line, i) => (
            <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <input
                dir={rtl ? 'auto' : undefined}
                value={line}
                placeholder={placeholder}
                aria-label={label}
                className="cth-input"
                onChange={(e) => setAt(i, e.target.value)}
                style={{ ...fieldStyle, flex: 1, minHeight: 34 }}
              />
              <button
                type="button"
                aria-label={removeLabel}
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                style={removeStyle}
              >
                <Icon name="x" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <PixelButton variant="ghost" size="sm" onClick={() => onChange([...items, ''])} style={{ alignSelf: 'flex-start' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon name="plus" />{addLabel}
        </span>
      </PixelButton>
    </Part>
  );
}

function Part({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--cth-ink-2)' }}>{label}</span>
      {children}
    </div>
  );
}

const fieldStyle = {
  width: '100%',
  boxSizing: 'border-box' as const,
  padding: '7px 10px',
  background: 'var(--cth-card)',
  border: 'none',
  fontFamily: 'var(--cth-font-ui)',
  fontSize: 13,
  lineHeight: '18px',
  color: 'var(--cth-ink)',
  outline: 'none',
  resize: 'vertical' as const
};

const removeStyle = {
  flexShrink: 0,
  width: 28,
  height: 28,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  borderRadius: 'var(--cth-r-md)',
  background: 'transparent',
  color: 'var(--cth-ink-500)',
  cursor: 'pointer',
  padding: 0
};
