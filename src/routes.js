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
  { id: 'dashboard', label: 'Overview', path: pagePaths.dashboard },
  { id: 'expenses', label: 'All expenses', path: pagePaths.expenses },
  { id: 'due', label: 'Due today', path: pagePaths.due },
  { id: 'calendar', label: 'Calendar', path: pagePaths.calendar },
  { id: 'budgets', label: 'Budgets & reports', path: pagePaths.budgets },
  { id: 'trash', label: 'Trash', path: pagePaths.trash },
]

export const routeLabels = Object.fromEntries([
  ...primaryNavigation.map(({ id, label }) => [id, label]),
  ['settings', 'Settings'],
])
