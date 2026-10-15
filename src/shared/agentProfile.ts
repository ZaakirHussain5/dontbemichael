/**
 * An agent's Profile tab, read out of what the app already stores
 * (docs/designs/agent-profile.md, owner 2026-09-25).
 *
 * The role line every agent carries (`description`, the registry `role`) is
 * written for Michael's routing: "Executive Admin: Pam sorts the business inbox
 * ... Send here for "a", "b" or inbox cleanup. Not for X; that goes to Y."
 * This splits it into the parts an owner reads: the job title, what the job
 * is, what to send, and what goes elsewhere. Pure: no fs, no React.
 */

export interface RoleLine {
  /** "Executive Admin"; empty when the line has no "Title: " lead. */
  title: string;
  /** The rest, minus the routing sentences. */
  summary: string;
  /** "anything important in email", "did the client reply", "inbox cleanup". */
  sendFor: string[];
  /** "Not for writing answers to customer questions; that goes to Customer Support." */
  notFor: string;
}

const capital = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/** Sentences, keeping quoted text whole (a period inside quotes doesn't split). */
function sentences(text: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    cur += c;
    if (c === '"' || c === '“' || c === '”') quoted = !quoted;
    if (!quoted && (c === '.' || c === '!' || c === '?') && (i + 1 === text.length || /\s/.test(text[i + 1]))) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

export function parseRoleLine(description: string | undefined): RoleLine {
  const text = (description ?? '').replace(/\s+/g, ' ').trim();
  const colon = text.indexOf(': ');
  // A title is short; a colon deep in a sentence is not a title.
  const hasTitle = colon > 0 && colon <= 40;
  const title = hasTitle ? capital(text.slice(0, colon).trim()) : '';
  const body = hasTitle ? text.slice(colon + 2) : text;

  const kept: string[] = [];
  let sendFor: string[] = [];
  let notFor = '';
  for (const s of sentences(body)) {
    const send = /^Send here for (.+?)\.?$/i.exec(s);
    if (send) {
      sendFor = send[1]
        .split(/,\s*|\s+or\s+|\s+and\s+/)
        .map((p) => p.replace(/^["“]|["”]$/g, '').trim())
        .filter(Boolean);
      continue;
    }
    if (/^Not for\b/i.test(s)) { notFor = s; continue; }
    kept.push(s);
  }
  return { title, summary: capital(kept.join(' ')), sendFor, notFor };
}

/** A work style is written to the agent ("The owner set this work style for
 *  your role at ..."); its first line only says who it's for, so the Profile
 *  drops it and shows the rest. */
export function workStyleBody(goal: string | undefined): string {
  return (goal ?? '').replace(/^The owner set this work style for your role[^\n]*\n+/, '').trim();
}

/** What the Profile lists for a team member who has a saved work style.
 *  `found` is false when the text has neither section, so the caller can keep
 *  the Office Pack lists. An empty section still counts as found: the owner
 *  left it out, and the pack's old line must not fill it back in. */
export interface ProfileDuties {
  found: boolean;
  /** "How the work is done", one line or sentence each. */
  does: string[];
  /** "Asks the owner first", one line or sentence each. */
  asksFirst: string[];
}

/** A heading the work style uses for those two parts, in either form the app
 *  stores: the plain labels the owner edits, or the house headings the agent
 *  is given. "The job" only ends the previous part. */
function dutyHeading(line: string): { section: 'does' | 'asks' | 'skip'; rest: string } | null {
  const text = line.trim().replace(/^#{1,6}\s+/, '');
  // A colon, or nothing else on the line. A sentence that merely starts
  // with the words ("How to work the dough takes practice.") is not a heading.
  const rules: Array<{ section: 'does' | 'asks' | 'skip'; re: RegExp }> = [
    { section: 'does', re: /^(?:how the work is done|how to work|what you do)\s*(?::\s*(.*)|\s*)$/i },
    { section: 'asks', re: /^(?:asks (?:you|the owner) first|needs the owner'?s approval(?:\s*\([^)]*\))?)\s*(?::\s*(.*)|\s*)$/i },
    { section: 'skip', re: /^the job\s*(?::\s*(.*)|\s*)$/i }
  ];
  for (const rule of rules) {
    const hit = rule.re.exec(text);
    if (hit) return { section: rule.section, rest: (hit[1] ?? '').trim() };
  }
  return null;
}

function dutyItems(lines: string[]): string[] {
  const items: string[] = [];
  for (const line of lines) {
    const text = line.replace(/^[•*\-]\s+/, '').trim();
    if (!text) continue;
    for (const sentence of sentences(text)) items.push(sentence);
  }
  return items;
}

/** The two lists an owner scans, read from the saved work style rather than
 *  the Office Pack card. Michael is not passed here: his lists are written
 *  for him in the app. */
export function profileDuties(goal: string | undefined): ProfileDuties {
  const does: string[] = [];
  const asksFirst: string[] = [];
  let section: 'does' | 'asks' | 'skip' | null = null;
  let found = false;
  const bucket: string[] = [];
  const flush = (): void => {
    const items = dutyItems(bucket);
    bucket.length = 0;
    if (section === 'does') does.push(...items);
    else if (section === 'asks') asksFirst.push(...items);
  };
  for (const raw of workStyleBody(goal).split('\n')) {
    const heading = dutyHeading(raw);
    if (heading) {
      flush();
      if (heading.section === 'does' || heading.section === 'asks') found = true;
      section = heading.section;
      if (heading.rest) bucket.push(heading.rest);
      continue;
    }
    if (section === 'does' || section === 'asks') bucket.push(raw);
  }
  flush();
  return { found, does, asksFirst };
}
