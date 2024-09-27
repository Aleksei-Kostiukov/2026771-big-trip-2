import PageTop from '/src/view/page-top-view.js';
import Sorting from '/src/view/list-sort-view.js';
import RoutePointList from '/src/view/route-points-list-view.js';
import ListEmpty from '/src/view/list-empty-view.js';
import { render, RenderPosition, remove } from '../framework/render.js';
import PointPresenter from './point-presenter.js';
import { calculateEventDuration, isEscape } from '../utils.js';
import FilterPresenter from './filters-presenter.js';
import { MessageWithoutPoint, FiltersScheme, UserAction, COUNT_CITIES, Calendar, ButtonText, TimeLimit } from '../constants.js';
import NewPointView from '/src/view/new-point-view.js';
import Loading from '/src/view/loading-view.js';
import FailedLoadData from '/src/view/failed-load-data-view.js';
import UiBlocker from '../framework/ui-blocker/ui-blocker.js';

export default class Presenter {
  #filterContentBlock;
  #contentBlock;
  #pageTopBlock;
  #tripListModel;
  #destinationsModel;
  #offersModel;
  #filterModel;
  #pageTop = new PageTop();
  #routePointList = new RoutePointList();
  #pointPresenters = new Map();
  #currentSortType = 'day';
  #sorting = null;
  #filterPresenter = null;
  #creatingPointComponent = null;
  #newEventButton = null;
  #newPointElement = null;
  #isCreatingNewPoint = false;
  #isDataLoadingError = false;
  #uiBlocker = new UiBlocker({
    lowerLimit: TimeLimit.LOWER_LIMIT,
    upperLimit: TimeLimit.UPPER_LIMIT
  });

  constructor({ FilterContentBlock, ContentBlock, PageTopBlock, tripListModel, destinationsModel, offersModel, filterModel }) {
    this.#filterContentBlock = FilterContentBlock;
    this.#contentBlock = ContentBlock;
    this.#pageTopBlock = PageTopBlock;
    this.#tripListModel = tripListModel;
    this.#destinationsModel = destinationsModel;
    this.#offersModel = offersModel;
    this.#filterModel = filterModel;

    this.#sorting = new Sorting({
      onSortTypeChange: this.#handleSortTypeChange,
      initialSortType: this.#currentSortType
    });

    this.#filterPresenter = new FilterPresenter({
      filterContentBlock: this.#filterContentBlock,
      tripListModel: this.#tripListModel,
      filterModel: this.#filterModel,
      onFilterChange: this.#handleFilterChange
    });

    this.#filterModel.addObserver(this.#handleFilterModelChange);
    this.#tripListModel.addObserver(() => this.#updatePoints());
  }

  async init() {
    render(this.#pageTop, this.#pageTopBlock, RenderPosition.AFTERBEGIN);
    render(this.#sorting, this.#contentBlock);
    render(this.#routePointList, this.#contentBlock);

    const loadingComponent = new Loading();
    render(loadingComponent, this.#contentBlock);

    try {
      this.#isDataLoadingError = false;
      await Promise.all([
        this.#filterPresenter.init().finally(() => {
          remove(loadingComponent);
          this.#renderNewPointButton();
        }),
        this.#destinationsModel.init(),
        this.#offersModel.init(),
      ]);

      this.#updatePoints();
    } catch (error) {
      this.#isDataLoadingError = true;
      this.#updatePoints();
      render(new FailedLoadData(), this.#contentBlock);
    }
  }

  isCreatingNewPoint() {
    return this.#isCreatingNewPoint;
  }

  #renderNewPointButton() {
    this.#newEventButton = document.querySelector('.trip-main__event-add-btn');
    this.#newEventButton.addEventListener('click', this.#newPointButtonClickHandler);
  }

  #newPointButtonClickHandler = () => {

    this.#clearEmptyMessage();
    this.#modeChangeHandler();
    this.#filterModel.setFilter(FiltersScheme.EVERYTHING);
    this.#currentSortType = 'day';
    this.#sorting.resetSortType();
    this.#newPointElement = document.querySelector('.trip-events__list');

    if (this.#creatingPointComponent) {
      this.#creatingPointComponent.element.remove();
      this.#creatingPointComponent = null;
    }

    const defaultType = 'flight';
    const defaultOffers = this.#offersModel.offers.find((offer) => offer.type === defaultType).offers;
    this.#creatingPointComponent = new NewPointView({
      point: {
        isFavorite: false,
        type: defaultType,
        offers: defaultOffers,
        destination: null,
        dateFrom: '',
        dateTo: '',
        basePrice: 0
      },
      destinations: this.#destinationsModel.destinations,
      offers: this.#offersModel.offers,
      onSave: this.#newPointSaveHandler,
      onCancel: this.#newPointCancelHandler,
      onTypeChange: this.#typeChangeHandler,
    });

    render(this.#creatingPointComponent, this.#newPointElement, RenderPosition.AFTERBEGIN);
    document.addEventListener('keydown', this.#escNewPointKeyDownHandler);
    this.#newEventButton.disabled = true;
    this.#isCreatingNewPoint = true;
  };

  #newPointSaveHandler = async (point) => {
    this.#uiBlocker.block();
    this.#creatingPointComponent.updateButtonText(ButtonText.SAVING);

    try {
      await this.#tripListModel.addPoint(point);
      this.#updatePoints();
      this.#creatingPointComponent.updateButtonText(ButtonText.SAVE);
      remove(this.#creatingPointComponent);
      document.removeEventListener('keydown', this.#escNewPointKeyDownHandler);
      this.#newEventButton.disabled = false;
      this.#uiBlocker.unblock();
    } catch (error) {
      this.#creatingPointComponent.updateButtonText(ButtonText.SAVE);
      this.#creatingPointComponent.shake(() => {
        this.#resetCreatingPointComponent();
        this.#uiBlocker.unblock();
      });
    }
  };

  #saveCurrentPointData = () => {
    const pointData = this.#creatingPointComponent.getPointData();
    return pointData;
  };

  #resetCreatingPointComponent = () => {

    const savedData = this.#saveCurrentPointData();

    remove(this.#creatingPointComponent);

    this.#creatingPointComponent = new NewPointView({
      point: savedData,
      destinations: this.#destinationsModel.destinations,
      offers: this.#offersModel.offers,
      onSave: this.#newPointSaveHandler,
      onCancel: this.#newPointCancelHandler,
      onTypeChange: this.#typeChangeHandler,
    });

    render(this.#creatingPointComponent, this.#newPointElement, RenderPosition.AFTERBEGIN);
    document.addEventListener('keydown', this.#escNewPointKeyDownHandler);
  };

  #escNewPointKeyDownHandler = (evt) => {
    if (isEscape(evt)) {
      this.#newPointCancelHandler();
    }
  };

  #newPointCancelHandler = () => {
    if(this.#isCreatingNewPoint){
      this.#newEventButton.disabled = false;
      this.#isCreatingNewPoint = false;
      remove(this.#creatingPointComponent);
      document.removeEventListener('keydown', this.#escNewPointKeyDownHandler);
    }
  };

  #handleSortTypeChange = (sortType) => {
    if (this.#currentSortType === sortType) {
      return;
    }

    this.#currentSortType = sortType;
    this.#updatePoints();
  };

  #handleFilterChange = (filter) => {
    this.#filterModel.setFilter(filter);
  };

  #clearEmptyMessage() {
    const emptyMessageElement = this.#contentBlock.querySelector('.trip-events__msg');
    if (emptyMessageElement) {
      emptyMessageElement.remove();
    }
  }

  #handleFilterModelChange = () => {
    this.#currentSortType = 'day';
    this.#sorting.resetSortType();
    this.#clearEmptyMessage();
    this.#updatePoints();
  };

  #typeChangeHandler = (newType) => {

    const offerData = this.#offersModel.offers.find((offer) => offer.type === newType);

    if (!offerData) {
      return;
    }

    const updatedOffers = offerData.offers;

    if (this.#creatingPointComponent) {
      this.#creatingPointComponent.updateOffers(updatedOffers);
    }
  };

  #getFilteredPoints() {
    const points = [...this.#tripListModel.points];
    const currentFilterType = this.#filterModel.filter;

    switch (currentFilterType) {
      case FiltersScheme.PAST:
        return points.filter((point) => new Date(point.dateTo) < new Date());
      case FiltersScheme.PRESENT:
        return points.filter((point) => new Date(point.dateFrom) <= new Date() && new Date(point.dateTo) >= new Date());
      case FiltersScheme.FUTURE:
        return points.filter((point) => new Date(point.dateFrom) > new Date());
      default:
        return points;
    }
  }

  #updatePoints() {

    if (this.#isDataLoadingError) {
      return;
    }

    const points = this.#getSortedPoints();
    this.#clearPoints();

    if (points.length === 0) {
      let message;
      const currentFilter = this.#filterModel.filter;

      switch (currentFilter) {
        case FiltersScheme.PAST:
          message = MessageWithoutPoint.PAST;
          break;
        case FiltersScheme.PRESENT:
          message = MessageWithoutPoint.PRESENT;
          break;
        case FiltersScheme.FUTURE:
          message = MessageWithoutPoint.FUTURE;
          break;
        default:
          message = MessageWithoutPoint.EVERYTHING;
      }

      render(new ListEmpty(message), this.#contentBlock);
    } else {
      this.#renderPoints(points);
      this.#updatePageTop();
    }
  }

  #getSortedPoints() {
    const points = [...this.#getFilteredPoints()];

    switch (this.#currentSortType) {
      case 'price':
        return points.sort((a, b) => b.basePrice - a.basePrice);
      case 'time':
        return points.sort((a, b) => {
          const durationA = calculateEventDuration(a.dateFrom, a.dateTo, true);
          const durationB = calculateEventDuration(b.dateFrom, b.dateTo, true);
          return durationB - durationA;
        });
      case 'day':
        return points.sort((a, b) => new Date(a.dateFrom) - new Date(b.dateFrom));
      default:
        return points;
    }
  }

  #clearPoints() {
    this.#pointPresenters.forEach((presenter) => presenter.destroy());
    this.#pointPresenters.clear();
  }

  #renderPoints(points) {
    points.forEach((point) => this.#renderPoint(point));
  }

  #renderPoint(point) {
    const pointPresenter = new PointPresenter({
      routePointListElement: this.#routePointList.element,
      destinationsModel: this.#destinationsModel,
      offersModel: this.#offersModel,
      onDataChange: this.#pointChangeHandler,
      onModeChange: this.#modeChangeHandler,
      onNewPointCancel: this.#newPointCancelHandler
    });

    pointPresenter.init(point);
    this.#pointPresenters.set(point.id, pointPresenter);
  }

  #updatePageTop() {
    const points = this.#getFilteredPoints();

    if (points.length === 0) {
      this.#pageTop.update({ title: '', dates: '', cost: 0 });
      return;
    }

    const sortedPoints = this.#getSortedPoints();
    const firstPoint = sortedPoints[0];
    const lastPoint = sortedPoints[sortedPoints.length - 1];
    const title = this.#generateTitle(sortedPoints);
    const dates = `${new Date(firstPoint.dateFrom).toLocaleDateString(Calendar.LOCALE, {day: Calendar.FORMAT,month: Calendar.MONTH}).toUpperCase()} — ${new Date(lastPoint.dateTo).toLocaleDateString(Calendar.LOCALE, {day: Calendar.FORMAT,month: Calendar.MONTH}).toUpperCase()}`;
    const cost = this.#calculateTotalCost(sortedPoints);
    this.#pageTop.update({ title, dates, cost });
  }

  #generateTitle(points) {

    const cities = points.map((point) => {
      const destination = this.#destinationsModel.destinations.find((dest) => dest.id === point.destination);
      return destination ? destination.name : '';
    });
    if (cities.length <= COUNT_CITIES) {
      return cities.join(' — ');
    }
    return `${cities[0]} —...— ${cities[cities.length - 1]}`;
  }

  #findOfferByTypeAndId(type, id) {
    const typeOffers = this.#offersModel.offers.find((offerGroup) => offerGroup.type === type);
    return typeOffers.offers.find((offer) => offer.id === id);
  }

  #calculateTotalCost(points) {
    return points.reduce((total, point) => {
      const offersCost = point.offers.reduce((sum, offer) => {
        const foundOffer = this.#findOfferByTypeAndId(point.type, offer);
        return sum + (foundOffer ? foundOffer.price : 0);
      }, 0);
      return total + point.basePrice + offersCost;
    }, 0);
  }

  #pointChangeHandler = async (updatedPoint, actionType) => {

    switch (actionType) {
      case UserAction.DELETE:
        await this.#tripListModel.deletePoint(updatedPoint.id);
        break;
      case UserAction.UPDATE:
        await this.#tripListModel.updatePoint(updatedPoint);
        break;
      case UserAction.ADD:
        await this.#tripListModel.addPoint(updatedPoint);
        break;
    }
    this.#updatePoints();
  };

  #modeChangeHandler = () => {
    this.#pointPresenters.forEach((presenter) => presenter.resetView());
  };
}
