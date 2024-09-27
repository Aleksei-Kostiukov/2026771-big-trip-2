import { render, replace, remove } from '../framework/render.js';
import RoutePoint from '/src/view/route-point-view.js';
import EditPoint from '/src/view/edit-point-view.js';
import { isEscape } from '../utils.js';
import { Mode, UserAction, ButtonText, TimeLimit } from '../constants.js';
import UiBlocker from '../framework/ui-blocker/ui-blocker.js';

export default class PointPresenter {
  #routePointListElement;
  #onDataChange;
  #onModeChange;
  #pointComponent;
  #pointEditComponent;
  #point;
  #destinationsModel;
  #offersModel;
  #mode = Mode.DEFAULT;
  #onNewPointCancel;
  #uiBlocker = new UiBlocker({
    lowerLimit: TimeLimit.LOWER_LIMIT,
    upperLimit: TimeLimit.UPPER_LIMIT
  });

  constructor({ routePointListElement, destinationsModel, offersModel, onDataChange, onModeChange, onNewPointCancel }) {
    this.#routePointListElement = routePointListElement;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#onDataChange = onDataChange;
    this.#onModeChange = onModeChange;
    this.#onNewPointCancel = onNewPointCancel;
  }

  init(point) {
    this.#point = point;
    const destinations = this.#destinationsModel.destinations;
    const offers = this.#offersModel.offers;

    const prevPointComponent = this.#pointComponent;
    const prevPointEditComponent = this.#pointEditComponent;

    this.#pointComponent = new RoutePoint({
      point: this.#point,
      destinations: destinations,
      offers: offers,
      onEditClick: this.#editClickHandler,
      onFavoriteClick: this.#favoriteClickHandler,
      onDeleteClick: this.#deleteClickHandler,
    });

    this.#pointEditComponent = new EditPoint({
      point: this.#point,
      destinations: destinations,
      offers: offers,
      onFormSubmit: this.#formSubmitHandler,
      onRollupClick: this.#rollupClickHandler
    });

    if (!prevPointComponent || !prevPointEditComponent) {

      render(this.#pointComponent, this.#routePointListElement);
      return;
    }

    if (this.#mode === Mode.DEFAULT) {
      replace(this.#pointComponent, prevPointComponent);
    }

    if (this.#mode === Mode.EDITING) {
      replace(this.#pointEditComponent, prevPointEditComponent);
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
      this.#pointEditComponent.reset(this.#point);
      this.#replaceFormToCard();
    }
  }

  #replaceCardToForm() {
    if (this.#onNewPointCancel) {
      this.#onNewPointCancel();
    }
    replace(this.#pointEditComponent, this.#pointComponent);
    document.addEventListener('keydown', this.#escKeyDownHandler);
    this.#onModeChange();
    this.#mode = Mode.EDITING;
  }

  #replaceFormToCard() {
    replace(this.#pointComponent, this.#pointEditComponent);
    document.removeEventListener('keydown', this.#escKeyDownHandler);
    this.#mode = Mode.DEFAULT;
  }

  #escKeyDownHandler = (evt) => {
    if (isEscape(evt)) {
      evt.preventDefault();
      this.#pointEditComponent.reset(this.#point);
      this.#replaceFormToCard();
    }
  };

  #editClickHandler = () => {
    this.#replaceCardToForm();
  };

  #rollupClickHandler = () => {
    this.#pointEditComponent.reset(this.#point);
    this.#replaceFormToCard();
  };

  #favoriteClickHandler = () => {
    this.#onDataChange({ ...this.#point, isFavorite: !this.#point.isFavorite }, UserAction.UPDATE);
  };

  #formSubmitHandler = async (updatedPoint) => {
    this.#uiBlocker.block();
    try {
      if (!updatedPoint) {
        this.#pointEditComponent.updateButtonText(ButtonText.DELETING);
        await this.#onDataChange(this.#point, UserAction.DELETE);
      } else {
        this.#pointEditComponent.updateButtonText(ButtonText.SAVING);
        await this.#onDataChange(updatedPoint, UserAction.UPDATE);
      }
    } catch (error) {
      this.#pointEditComponent.shake(() => {
        this.#pointEditComponent.reset(this.#point);
      });

    } finally {
      this.#uiBlocker.unblock();
    }
  };

  #deleteClickHandler = () => {
    this.#formSubmitHandler(null);

  };
}
