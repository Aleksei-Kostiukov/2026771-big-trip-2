import { render, replace, remove } from '../framework/render.js';
import RoutePoint from '/src/view/route-point-view.js';
import EditPoint from '/src/view/edit-point-view.js';
import { isEscape } from '../utils.js';
import { Mode } from '../constants.js';
import Offer from '/src/view/offer-view.js';
import Destination from '/src/view/destination-view.js';

export default class PointPresenter {
  #routePointListElement;
  #handleDataChange;
  #handleModeChange;
  #pointComponent;
  #pointEditComponent;
  #point;
  #destinations;
  #offers;
  #mode = Mode.DEFAULT;
  #offerComponent;
  #destinationComponent;

  constructor({ routePointListElement, onDataChange, onModeChange }) {
    this.#routePointListElement = routePointListElement;
    this.#handleDataChange = onDataChange;
    this.#handleModeChange = onModeChange;
  }

  init(point, destinations, offers) {
    this.#point = point;
    this.#destinations = destinations;
    this.#offers = offers;

    const prevPointComponent = this.#pointComponent;
    const prevPointEditComponent = this.#pointEditComponent;

    this.#pointComponent = new RoutePoint({
      point: this.#point,
      destinations: this.#destinations,
      offers: this.#offers,
      onEditClick: this.#handleEditClick,
      onFavoriteClick: this.#handleFavoriteClick
    });

    this.#pointEditComponent = new EditPoint({
      point: this.#point,
      destinations: this.#destinations,
      offers: this.#offers,
      onFormSubmit: this.#handleFormSubmit,
      onRollupClick: this.#handleRollupClick
    });

    if (prevPointComponent === undefined || prevPointEditComponent === undefined) {
      render(this.#pointComponent, this.#routePointListElement);
      return;
    }

    if (this.#mode === Mode.DEFAULT) {
      replace(this.#pointComponent, prevPointComponent);
    }

    if (this.#mode === Mode.EDITING) {
      replace(this.#pointEditComponent, prevPointEditComponent);
      this.#renderOffersAndDestinations();
    }

    remove(prevPointComponent);
    remove(prevPointEditComponent);
  }

  destroy() {
    remove(this.#pointComponent);
    remove(this.#pointEditComponent);
  }

  resetView() {
    if (this.#mode !== Mode.DEFAULT) {
      this.#replaceFormToCard();
    }
  }

  #replaceCardToForm() {
    replace(this.#pointEditComponent, this.#pointComponent);
    this.#renderOffersAndDestinations();
    document.addEventListener('keydown', this.#escKeyDownHandler);
    this.#handleModeChange();
    this.#mode = Mode.EDITING;
  }

  #replaceFormToCard() {
    replace(this.#pointComponent, this.#pointEditComponent);
    this.#removeOffersAndDestinations();
    document.removeEventListener('keydown', this.#escKeyDownHandler);
    this.#mode = Mode.DEFAULT;
  }

  #renderOffersAndDestinations() {
    const eventDetailsElement = this.#pointEditComponent.element.querySelector('.event__details');
    this.#offerComponent = new Offer(this.#point, this.#offers);
    this.#destinationComponent = new Destination(this.#point, this.#destinations);

    render(this.#offerComponent, eventDetailsElement);
    render(this.#destinationComponent, eventDetailsElement);
  }

  #removeOffersAndDestinations() {
    if (this.#offerComponent) {
      remove(this.#offerComponent);
    }
    if (this.#destinationComponent) {
      remove(this.#destinationComponent);
    }
  }

  #escKeyDownHandler = (evt) => {
    if (isEscape(evt)) {
      evt.preventDefault();
      this.#replaceFormToCard();
    }
  };

  #handleEditClick = () => {
    this.#replaceCardToForm();
  };

  #handleRollupClick = () => {
    this.#replaceFormToCard();
  };

  #handleFavoriteClick = () => {
    this.#handleDataChange({ ...this.#point, isFavorite: !this.#point.isFavorite });
  };

  #handleFormSubmit = (updatedPoint) => {
    this.#handleDataChange(updatedPoint);
    this.#replaceFormToCard();
  };
}