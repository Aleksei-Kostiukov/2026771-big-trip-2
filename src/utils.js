function getRandomArrayElement(items, count = 1) {
  const shuffled = items.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function getRandomNumber(MinPrice, MaxPrice) {
  return Math.floor(Math.random() * (MaxPrice - MinPrice + 1)) + MinPrice;
}

function calculateEventDuration(dateFrom, dateTo, forCalculation = false) {

  const start = new Date(dateFrom);
  const end = new Date(dateTo);
  const duration = end - start;

  const totalMinutes = Math.floor(duration / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (forCalculation) {
    return duration;
  }

  let result = '';

  if (days > 0) {
    result += `${days}D `;
  }

  if (days > 0 || hours > 0) {
    result += `${hours.toString().padStart(2, '0')}H `;
  }

  result += `${minutes.toString().padStart(2, '0')}M`;

  return result.trim();
}

function formatDateToISOString(dateStr) {

  const [day, month, yearAndTime] = dateStr.split('/');
  const [year, time] = yearAndTime.split(' ');
  const [hours, minutes] = time.split(':');
  // const timeZone = customISOString.slice(-4);
  const isoDateStr = `20${year}-${month}-${day}T${hours}:${minutes}:00.266Z`; // ВОПРОС, откуда брать часовой пояс если точка новая
  const date = new Date(isoDateStr);
  const formattedDateStr = date.toISOString();

  return formattedDateStr;
}

const isEscape = (evt) => evt.key === 'Escape';

function countPointsByFilter(points) {
  const currentDate = new Date();

  return {
    everething: points.length,
    future: points.filter((point) => new Date(point.dateFrom) > currentDate).length,
    present: points.filter((point) => new Date(point.dateFrom) <= currentDate && new Date(point.dateTo) >= currentDate).length,
    past: points.filter((point) => new Date(point.dateTo) < currentDate).length,
  };
}


export {getRandomArrayElement, getRandomNumber, calculateEventDuration, isEscape, countPointsByFilter, formatDateToISOString};
