import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Kolkata');

export function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export function formatDate(date) {
  return dayjs(date).tz('Asia/Kolkata').format('DD MMM YYYY, HH:mm');
}

export function formatDateShort(date) {
  return dayjs(date).tz('Asia/Kolkata').format('DD MMM YYYY');
}

export function monthParam(date = new Date()) {
  return dayjs(date).format('YYYY-MM');
}

export function formatAmount(amount, type = 'expense') {
  const numAmount = Number(amount) || 0;
  const formatted = formatINR(Math.abs(numAmount));
  
  if (type.toLowerCase() === 'income') {
    return `+${formatted}`;
  }
  return `-${formatted}`;
}
