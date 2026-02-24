
export const getCurrentTimeInTimezone = (timezone: string): string => {
  const now = new Date();
  try {
    // Usamos Intl.DateTimeFormat para obtener la fecha y hora en la zona horaria deseada
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    
    const parts = formatter.formatToParts(now);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value;
    
    // Construimos el string ISO manualmente para evitar desfases
    const year = getPart('year');
    const month = getPart('month');
    const day = getPart('day');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    
    return `${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`;
  } catch (e) {
    console.error("Error formatting timezone:", e);
    return now.toISOString();
  }
};

export const getLocalDateInTimezone = (timezone: string): string => {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA da formato YYYY-MM-DD
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    return formatter.format(now);
  } catch (e) {
    return now.toISOString().split('T')[0];
  }
};
