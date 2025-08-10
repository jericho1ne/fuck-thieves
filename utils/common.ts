import { DateTime } from 'luxon'

/**
 * Format date from DD-MM-YYYY to "Aug 08, 2025"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return ''
  
  // Split DD-MM-YYYY format
  const [day, month, year] = dateString.split('-')
  
  if (!day || !month || !year) return dateString // Return original if format is unexpected
  
  // Parse with Luxon and format
  const dt = DateTime.fromObject({
    year: parseInt(year),
    month: parseInt(month),
    day: parseInt(day)
  })
  
  // Format as "Aug 08, 2025"
  return dt.toFormat('MMM dd, yyyy')
}
