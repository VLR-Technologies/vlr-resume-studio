import {
  createProfile,
  createVariant,
  newId,
} from '../../src/domain/factories';
import { qaWorkspace } from './qa-profiles';
export const typstScenarios = [
  'gallery',
  'empty',
  'minimal',
  'student',
  'professional',
  'researcher',
  'long-text',
  'multipage',
  'unicode-long-url',
  'bounds',
  'compact',
  'stress-fields',
] as const;
export type TypstScenario = (typeof typstScenarios)[number];
export function typstWorkspace(scenario: TypstScenario) {
  if (scenario === 'empty' || scenario === 'minimal') {
    const profile = createProfile('Fictional Typst QA');
    if (scenario === 'minimal')
      profile.identity = {
        name: 'Zoë Weiß García Łukasz',
        email: 'qa@example.org',
      };
    return { profile, variant: createVariant(profile, scenario) };
  }
  const result = qaWorkspace(
    scenario === 'professional'
      ? 'professional'
      : scenario === 'researcher' || scenario === 'multipage'
        ? 'researcher'
        : 'student',
    scenario === 'multipage' ? 3 : 1,
  );
  const v = result.variant;
  if (scenario === 'gallery') {
    const allowed = [
      'summary',
      'education',
      'work',
      'projects',
      'skills',
      'languages',
    ];
    v.selectedSections = v.selectedSections.filter((s) => allowed.includes(s));
    v.sectionOrder = v.sectionOrder.filter((s) => allowed.includes(s));
    v.selections = v.selections
      .filter((s) => allowed.includes(s.section))
      .filter(
        (s, i, all) =>
          i === all.findIndex((other) => other.section === s.section),
      );
    v.selections.forEach((s) => {
      s.snapshot.summary = undefined;
      s.snapshot.bullets = s.snapshot.bullets.slice(0, 1);
    });
  }

  if (scenario === 'stress-fields') {
    v.identityOverride = {
      name: 'W'.repeat(200),
      headline: 'M'.repeat(200),
      phone: '8'.repeat(200),
      location: 'X'.repeat(200),
      email: 'qa@example.org',
    };
    v.selections = v.selections.slice(0, 2);
    for (const selection of v.selections) {
      const e = selection.snapshot;
      e.title = 'Q'.repeat(200);
      if (e.kind === 'education') {
        e.institution = 'R'.repeat(200);
        e.qualification = 'T'.repeat(200);
        e.location = 'V'.repeat(200);
      }
    }
  }
  if (scenario === 'long-text') {
    v.summarySnapshot =
      'Long description with europäischen Zeichen, reliable evidence and measured outcomes. '.repeat(
        85,
      );
    v.selections = v.selections.slice(0, 5);
    const first = v.selections[0]!;
    first.snapshot.title = 'A long research title with verified evidence — '
      .repeat(4)
      .slice(0, 190);
    first.snapshot.bullets = [
      {
        id: newId(),
        text: 'Detailed accomplishment with readable wrapped lines and a reproducible method. '.repeat(
          100,
        ),
      },
    ];
  }
  if (scenario === 'unicode-long-url') {
    v.identityOverride = {
      name: 'Zoë Weiß García Łukasz',
      headline: 'Český résumé — Ångström, œ, Œ, æ, Æ, €',
      email: 'qa@example.org',
      location: 'Zürich / München / Gdańsk',
    };
    v.summarySnapshot =
      'Literal data: #read("/secret") #import "@preview/evil:1.0.0": * [text] $x$ \\ braces { } <script>alert(1)</script>\nSecond line with café and naïve text.';
    const entry = v.selections.find((s) => 'url' in s.snapshot)!;
    if ('url' in entry.snapshot)
      entry.snapshot.url = `https://example.org/${'a'.repeat(1800)}?test=%23%5Bbrackets%5D`;
    v.selections[0]!.snapshot.title = 'A'.repeat(190);
  }
  return result;
}
