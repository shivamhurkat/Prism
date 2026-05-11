export const PREMORTEM = {
  name: 'Premortem',
  description:
    'Imagine it is 18 months from now and the decision has failed badly. Trace backward to identify what went wrong and what early signals were missed.',
  assumptions:
    '- The decision happened as the user is leaning\n- The outcome is recognizably bad: lost capital, lost trust, lost time, lost talent, or compounding mistakes\n- Failure modes are concrete and traceable, not vague\n- Early warning signs existed and were available to see',
  time_horizon: '18 months hindsight',
  locked: true,
} as const
