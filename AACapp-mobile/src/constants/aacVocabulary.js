/**
 * NOTE: `emoji` has been removed from all suggestion objects.
 * Pictograms are now fetched automatically from the ARASAAC API
 * using each item's `label` as the search keyword.
 * See: hooks/usePictogram.js
 */

export const DEFAULT_SUGGESTIONS = [
  { label: 'Hello' },
  { label: 'Yes' },
  { label: 'No', arasaacId: '5526' },  // manual override example: https://arasaac.org/pictograms/5526/no
  { label: 'Please' },
  { label: 'Thank you' },
  { label: 'Help' },
  { label: 'More' },
  { label: 'Done' },
  { label: 'Wait' },
  { label: 'I want', arasaacId: '5441' },  // ⚠️ wrong pictogram? add: arasaacId: XXXXX
  { label: 'I need' },  
  { label: 'Go' },
];

export const CATEGORIES = {
  People: [
    { label: 'I', arasaacId: '6632' },
    { label: 'You' },
    { label: 'We', arasaacId: '7186'},
    { label: 'Mom' },
    { label: 'Dad' },
    { label: 'Friend' },
    { label: 'Teacher' },
    { label: 'Doctor' },
  ],
  Actions: [
    { label: 'Eat', arasaacId: '6456' },
    { label: 'Drink', arasaacId: '6061' },
    { label: 'Play' },
    { label: 'Read' },
    { label: 'Walk', arasaacId: '6044' },
    { label: 'Sleep', arasaacId: '6479' },
    { label: 'Listen' },
    { label: 'Watch' },
  ],
  Feelings: [
    { label: 'Happy' },
    { label: 'Sad' },
    { label: 'Tired' },
    { label: 'Hungry' },
    { label: 'Thirsty' },
    { label: 'Sick' },
    { label: 'Excited' },
    { label: 'Scared' },
  ],
  Places: [
    { label: 'Home' },
    { label: 'School' },
    { label: 'Outside' },
    { label: 'Bathroom' },
    { label: 'Kitchen' },
    { label: 'Bedroom' },
    { label: 'Store' },
    { label: 'Park',arasaacId: '39627' },
  ],
};

export const CATEGORY_COLORS = {
  Suggested: '#6C63FF',
  People: '#FF6B6B',
  Actions: '#4ECDC4',
  Feelings: '#FFD93D',
  Places: '#95E1D3',
};