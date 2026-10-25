import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { categories, categoryMeta, money } from '../utils/appData'
import { Empty } from './PageComponents'

export default function CategoryDonut({ expenses }) {
  const totals = categories
    .map(category => ({
      name: category,
      value: expenses.filter(expense => expense.category === category).reduce((total, expense) => total + expense.amount, 0),
    }))
    .filter(item => item.value)
    .sort((a, b) => b.value - a.value)
    .slice(0, 4)
  const total = totals.reduce((sum, item) => sum + item.value, 0)

  if (!totals.length) return <Empty text="Add expenses to see your report." />

  return <div className="category-donut">
    <div className="category-donut-chart">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 240, height: 160 }}>
        <PieChart>
          <Pie data={totals} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="100%" paddingAngle={2} stroke="none">
            {totals.map(item => <Cell key={item.name} fill={categoryMeta[item.name][0]} />)}
          </Pie>
          <Tooltip formatter={value => money(value)} contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="category-donut-center"><strong>{money(total)}</strong><span>total</span></div>
    </div>
    <ul className="category-donut-legend">
      {totals.map(item => <li key={item.name}><i style={{ background: categoryMeta[item.name][0] }}></i><span>{item.name}</span><strong>{money(item.value)}</strong></li>)}
    </ul>
  </div>
}
