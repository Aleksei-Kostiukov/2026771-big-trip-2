import Presenter from './presenter/main-presenter.js';
import TripListModel from './model/trip-list-model.js';
import DestinationsModel from './model/destinations-model.js';
import OffersModel from './model/offers-model.js';
import FilterModel from './model/filters-model.js';
import { AUTHORIZATION, SERVER_URL } from './constants.js';
import PointsApiService from './api-service.js';

const pointApiservice = new PointsApiService(SERVER_URL, AUTHORIZATION);
const tripListModel = new TripListModel({apiService: pointApiservice});
const filterModel = new FilterModel();
const destinationsModel = new DestinationsModel({apiService: pointApiservice});
const offersModel = new OffersModel({apiService: pointApiservice});

const sectionContentElement = document.querySelector('.trip-events');
const newPageTopElement = document.querySelector('.trip-main');
const filtersElement = newPageTopElement.querySelector('.trip-controls__filters');

const newPresenter = new Presenter({
  FilterContentBlock: filtersElement,
  ContentBlock: sectionContentElement,
  PageTopBlock: newPageTopElement,
  tripListModel: tripListModel,
  destinationsModel: destinationsModel,
  offersModel: offersModel,
  filterModel: filterModel,
});

newPresenter.init();

