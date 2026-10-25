import { money } from '../../utils/appData'

export function AnimatedMoney({ value = 0, className = '', as: Tag = 'span' }) {
  const numeric = Number(value) || 0
  return <Tag className={className} aria-label={money(numeric)}>{money(numeric)}</Tag>
}

export default AnimatedMoney
