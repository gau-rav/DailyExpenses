export const pagePaths = {
  dashboard: '/',
  expenses: '/expenses',
  due: '/due',
  calendar: '/calendar',
  budgets: '/budgets',
  trash: '/trash',
  settings: '/settings',
}

export const pageByPath = Object.fromEntries(Object.entries(pagePaths).map(([page, path]) => [path, page]))

export const primaryNavigation = [
  { id: 'dashboard', label: 'Overview', icon: '⌂', path: pagePaths.dashboard },
  { id: 'expenses', label: 'All expenses', icon: '▤', path: pagePaths.expenses },
  { id: 'due', label: 'Due today', icon: '◷', path: pagePaths.due },
  { id: 'calendar', label: 'Calendar', icon: '□', path: pagePaths.calendar },
  { id: 'budgets', label: 'Budgets & reports', icon: '◒', path: pagePaths.budgets },
  { id: 'trash', label: 'Trash', icon: '⌫', path: pagePaths.trash },
]

export const routeLabels = Object.fromEntries([
  ...primaryNavigation.map(({ id, label }) => [id, label]),
  ['settings', 'Settings'],
])
