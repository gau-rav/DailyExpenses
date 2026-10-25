export const pagePaths = {
  dashboard: '/',
  expenses: '/expenses',
  bills: '/bills',
  inbox: '/inbox',
  due: '/due',
  calendar: '/calendar',
  budgets: '/budgets',
  trash: '/trash',
  settings: '/settings',
  privacy: '/privacy',
  terms: '/terms',
}

export const pageByPath = Object.fromEntries(Object.entries(pagePaths).map(([page, path]) => [path, page]))

export const primaryNavigation = [
  { id: 'dashboard', label: 'Overview', path: pagePaths.dashboard },
  { id: 'expenses', label: 'All expenses', path: pagePaths.expenses },
  { id: 'bills', label: 'Bills', path: pagePaths.bills },
  { id: 'inbox', label: 'Email inbox', path: pagePaths.inbox },
  { id: 'due', label: 'Due today', path: pagePaths.due },
  { id: 'calendar', label: 'Calendar', path: pagePaths.calendar },
  { id: 'budgets', label: 'Budgets & reports', path: pagePaths.budgets },
  { id: 'trash', label: 'Trash', path: pagePaths.trash },
]

export const routeLabels = Object.fromEntries([
  ...primaryNavigation.map(({ id, label }) => [id, label]),
  ['settings', 'Settings'],
  ['privacy', 'Privacy policy'],
  ['terms', 'Terms & conditions'],
])
