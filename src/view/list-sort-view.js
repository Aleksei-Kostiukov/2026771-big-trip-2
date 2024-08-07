import AbstractView from '../framework/view/abstract-view.js';
import { SORT_TYPES } from '../constants.js';

function createSortTemplate(activeSortType) {
  return (
    `<form class="trip-events__trip-sort trip-sort" action="#" method="get">
      ${SORT_TYPES.map(({ type, active }) => {
        const label = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
        return (
          `<div class="trip-sort__item trip-sort__item--${type}">
              <input id="sort-${type}" class="trip-sort__input visually-hidden" type="radio" name="trip-sort" value="sort-${type}" ${active === 'disabled' ? 'disabled' : ''} ${type === activeSortType ? 'checked' : ''}>
              <label class="trip-sort__btn" for="sort-${type}" data-sort-type="${type}">${label}</label>
            </div>`
        );
      }).join('')}
    </form>`
  );
}

export default class Sorting extends AbstractView {
  #handleSortTypeChange = null;
  #currentSortType = 'day';

  constructor({ onSortTypeChange, initialSortType }) {
    super();
    this.#handleSortTypeChange = onSortTypeChange;
    this.#currentSortType = initialSortType || 'day';
    this.element.addEventListener('change', this.#sortTypeChangeHandler);
  }

  get template() {
    return createSortTemplate(this.#currentSortType);
  }

  #sortTypeChangeHandler = (evt) => {
    if (evt.target.tagName !== 'INPUT') {
      return;
    }

    evt.preventDefault();
    const sortType = evt.target.nextElementSibling.dataset.sortType;
    if (this.#handleSortTypeChange) {
      this.#handleSortTypeChange(sortType);
    }
  };

  updateSortType(newSortType) {
    this.#currentSortType = newSortType;
    this.element.innerHTML = this.template;
  }

  resetSortType() {
    this.updateSortType('day');
  }
}





