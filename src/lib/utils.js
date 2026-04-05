import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = '$') {
  return `${currency}${Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function freqMultiplier(freq) {
  if (freq === 'weekly') return 4.33;
  if (freq === 'biweekly') return 2.165;
  return 1;
}

export function freqLabel(freq) {
  if (freq === 'weekly') return 'Weekly';
  if (freq === 'biweekly') return 'Bi-weekly';
  return 'Monthly';
}

const AVATAR_COLORS = [
  { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { bg: 'bg-amber-100', text: 'text-amber-700' },
  { bg: 'bg-rose-100', text: 'text-rose-700' },
  { bg: 'bg-violet-100', text: 'text-violet-700' },
  { bg: 'bg-sky-100', text: 'text-sky-700' },
  { bg: 'bg-orange-100', text: 'text-orange-700' },
  { bg: 'bg-teal-100', text: 'text-teal-700' },
];

export function getAvatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0] || '').join('').toUpperCase().slice(0, 2) || '?';
}